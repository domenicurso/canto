import { layout } from "../layout/arrange";
import { contains } from "../layout/geometry";
import { LayoutInvalidation } from "../layout/invalidation";
import { resolveStyles } from "../layout/styles";
import { diff } from "../render/diff";
import { paint } from "../render/paint";
import { Screen } from "../render/screen";
import { editorView } from "./editor-view";

import type { Mode, Terminal } from "../terminal/transport";
import type { Mounted } from "./tree";

export interface FrameStats {
  cellsWritten: number;
  renderTime: number;
  layoutTime: number;
}
export class Frames {
  private previous: Screen | undefined;
  private readonly invalidation = new LayoutInvalidation();
  private size = "";
  stats: FrameStats = { cellsWritten: 0, renderTime: 0, layoutTime: 0 };
  constructor(
    private readonly terminal: Terminal,
    private readonly mode: Mode,
  ) {}
  async commit(root: Mounted, focused?: Mounted): Promise<void> {
    const start = performance.now();
    const screen = this.prepare(root);
    const previous =
      this.previous?.width === screen.width && this.previous.height === screen.height
        ? this.previous
        : undefined;
    const result = diff(previous, screen);
    if (this.previous && this.previous.height > screen.height) {
      for (let y = screen.height; y < this.previous.height; y++)
        result.output += `\x1b[${y + 1};1H\x1b[2K`;
    }
    await this.terminal.present(screen, result.output + cursorOutput(focused, screen));
    this.previous = screen;
    this.stats = {
      ...this.stats,
      cellsWritten: result.cellsWritten,
      renderTime: performance.now() - start,
    };
  }
  private prepare(root: Mounted): Screen {
    resolveStyles(root);
    const size = `${this.terminal.width}:${this.terminal.height}`;
    const changed = this.invalidation.changed(root) || size !== this.size;
    const start = performance.now();
    if (changed)
      layout(
        root,
        { width: this.terminal.width, height: this.terminal.height },
        this.mode === "fullscreen",
      );
    this.size = size;
    this.stats.layoutTime = changed ? performance.now() - start : 0;
    const height =
      this.mode === "inline"
        ? Math.min(this.terminal.height, Math.max(1, root.rect.height))
        : this.terminal.height;
    return paint(root, { width: this.terminal.width, height });
  }
}
function cursorOutput(focused: Mounted | undefined, screen: Screen): string {
  if (!focused?.element.data.props.input) return "\x1b[?25l";
  const cursor = editorView(focused).cursor;
  cursor.x = Math.min(focused.inner.x + focused.inner.width - 1, cursor.x);
  if (!contains({ x: 0, y: 0, width: screen.width, height: screen.height }, cursor.x, cursor.y))
    return "\x1b[?25l";
  let parent = focused.parent;
  while (parent) {
    if (parent.style.overflow !== "visible" && !contains(parent.inner, cursor.x, cursor.y))
      return "\x1b[?25l";
    parent = parent.parent;
  }
  return `\x1b[${cursor.y + 1};${cursor.x + 1}H\x1b[?25h`;
}
