import type { Screen } from "../render/screen";
import type { Mode, Terminal } from "../terminal/transport";
import type { DebugPanel } from "./debug-panel";
import type { ContentFrameStats, FrameStats } from "./frame-stats";
import type { Selection } from "./selection";
import type { Mounted } from "./tree";

import { layout, positionOverlays } from "../layout/arrange";
import { LayoutInvalidation } from "../layout/invalidation";
import { repositionScroll } from "../layout/scroll";
import { resolveStyles } from "../layout/styles";
import { diff } from "../render/diff";
import { maskRasterCells, RasterPlacements } from "../render/raster-placement";
import { RetainedPaint } from "../render/retained";
import { cursorOutput } from "./editor-cursor";
import { FrameRate } from "./frame-rate";

interface FrameInput {
  root: Mounted;
  startedAt: number;
  focused?: Mounted;
  selection?: Selection;
}
export class Frames {
  private readonly contentRasters = new RasterPlacements();
  private readonly shownRasters = new RasterPlacements();
  private readonly rate = new FrameRate();
  private readonly painter = new RetainedPaint();
  private previous?: Screen;
  private completedAt?: number;
  private content?: Screen;
  private readonly invalidation = new LayoutInvalidation();
  private size = "";
  stats: Readonly<FrameStats> = {
    frame: 0,
    fps: 0,
    cellsWritten: 0,
    renderTime: 0,
    contentTime: 0,
    updateTime: 0,
    layoutTime: 0,
    prepareTime: 0,
    paintTime: 0,
    diffTime: 0,
    layoutNodes: 0,
    paintedCells: 0,
    contentCellsWritten: 0,
    debugTime: 0,
    presentTime: 0,
    intervalTime: 0,
  };
  constructor(
    private readonly terminal: Terminal,
    private readonly mode: Mode,
    private readonly debug: DebugPanel,
  ) {}
  get viewport(): { width: number; height: number } {
    return { width: this.terminal.width, height: this.terminal.height };
  }
  invalidate(): void {
    this.previous = this.content = undefined;
  }
  async commit(input: FrameInput): Promise<void> {
    const { screen, stats, changes } = this.measureContent(input);
    const debugStart = performance.now();
    const shown = this.debug.compose(screen, stats, this.stats);
    if (shown !== screen) {
      shown.rasters = this.shownRasters.prepare(
        input.root,
        shown,
        this.terminal.graphics,
      );
      maskRasterCells(shown);
    }
    const result =
      shown === screen && this.previous === this.content
        ? changes
        : diff(matching(this.previous, shown), shown);
    const debugTime = performance.now() - debugStart;
    const presentStart = performance.now();
    await this.terminal.present(
      shown,
      result.output + cursorOutput(input.focused, screen, this.debug.rect),
    );
    const completedAt = performance.now();
    const presentation = this.terminal.presentation;
    this.rate.record(completedAt);
    this.previous = shown;
    this.content = screen;
    this.stats = {
      ...stats,
      fps: this.rate.rate(completedAt),
      cellsWritten: result.cellsWritten,
      debugTime,
      presentTime: completedAt - presentStart,
      renderTime: completedAt - input.startedAt,
      intervalTime:
        this.completedAt === undefined ? 0 : completedAt - this.completedAt,
      encodeTime: presentation?.encodeTime,
      writeTime: presentation?.writeTime,
      outputBytes: presentation?.bytes,
    };
    this.completedAt = completedAt;
  }
  private measureContent(input: FrameInput) {
    const updateTime = performance.now() - input.startedAt;
    const prepared = this.prepare(input.root);
    const paintStart = performance.now();
    const screen = this.painter
      .render(input.root, {
        ...prepared.size,
        cellSize: this.terminal.cellSize,
        theme: this.terminal.theme,
        graphics: this.terminal.graphics,
      })
      .clone();
    input.selection?.present(screen, input.root);
    screen.rasters = this.contentRasters.prepare(
      input.root,
      screen,
      this.terminal.graphics,
    );
    maskRasterCells(screen);
    const paintTime = performance.now() - paintStart;
    const diffStart = performance.now();
    const changes = diff(matching(this.content, screen), screen);
    const stats: ContentFrameStats = {
      frame: this.stats.frame + 1,
      fps: this.rate.rate(performance.now()),
      updateTime,
      ...prepared.stats,
      paintTime,
      diffTime: performance.now() - diffStart,
      contentTime: performance.now() - input.startedAt,
      paintedCells: this.painter.paintedCells,
      contentCellsWritten: changes.cellsWritten,
    };
    return { screen, stats, changes };
  }
  private prepare(root: Mounted) {
    const start = performance.now();
    resolveStyles(root);
    const viewport = this.viewport;
    const size = `${viewport.width}:${viewport.height}`;
    const changed = this.invalidation.changed(root) || size !== this.size;
    const layoutStart = performance.now();
    const layoutNodes = changed
      ? layout(root, viewport, this.mode === "fullscreen")
      : 0;
    const layoutTime = changed ? performance.now() - layoutStart : 0;
    repositionScroll(root);
    positionOverlays(root);
    this.size = size;
    return {
      size: {
        width: viewport.width,
        height:
          this.mode === "inline"
            ? Math.min(viewport.height, Math.max(1, root.rect.height))
            : viewport.height,
      },
      stats: {
        layoutNodes,
        prepareTime: performance.now() - start,
        layoutTime,
      },
    };
  }
}
function matching(
  previous: Screen | undefined,
  next: Screen,
): Screen | undefined {
  return previous?.width === next.width && previous.height === next.height
    ? previous
    : undefined;
}
