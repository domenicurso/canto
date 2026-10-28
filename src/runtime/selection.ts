import type { PointerEvent } from "../element/events";
import type { Screen } from "../render/screen";
import type { Mounted } from "./tree";

import { content } from "../layout/measure";
import { textOffset } from "../text/alignment";
import { take } from "../text/columns";
import { selectionRange, type SelectionUnit } from "../text/ranges";
import { editorView } from "./editor-view";
import { PointerClicks } from "./pointer-clicks";
import { TextSelection } from "./text-selection";

export class Selection {
  private editor?: Mounted;
  private readonly clicks = new PointerClicks();
  private unit: SelectionUnit = "character";
  private origin: [number, number] = [0, 0];
  private readonly selectedText = new TextSelection();
  private dragging = false;
  private screen?: Screen;
  text(focused?: Mounted): string {
    const selected = this.selectedText.text();
    if (selected) return selected;
    if (!focused?.active || !focused.element.data.props.input) return "";
    return content(focused).slice(
      Math.min(focused.cursor, focused.anchor ?? focused.cursor),
      Math.max(focused.cursor, focused.anchor ?? focused.cursor),
    );
  }
  press(node: Mounted | undefined, event: PointerEvent): void {
    const clicks = node ? this.clicks.press(node, event) : 1;
    this.clear(false);
    this.unit = clicks === 3 ? "line" : clicks === 2 ? "word" : "character";
    if (event.button !== 0 || !node) return;
    this.dragging = true;
    if (node.element.data.props.input) {
      this.editor = node;
      node.cursor = editorPosition(node, event);
      this.origin = selectionRange(content(node), node.cursor, this.unit);
      node.anchor = this.unit === "character" ? node.cursor : this.origin[0];
      if (this.unit !== "character") node.cursor = this.origin[1];
    } else
      this.dragging = this.screen
        ? this.selectedText.press(node, event, this.screen, clicks)
        : false;
  }
  move(event: PointerEvent): boolean {
    if (!this.dragging) return false;
    this.clicks.move(event);
    if (this.editor?.active) this.moveEditor(this.editor, event);
    else this.selectedText.move(event);
    if (event.action === "release") this.dragging = false;
    return true;
  }
  private moveEditor(node: Mounted, event: PointerEvent): void {
    const position = editorPosition(node, event);
    if (this.unit === "character") {
      node.cursor = position;
      return;
    }
    const range = selectionRange(content(node), position, this.unit);
    const reverse = position < this.origin[0];
    node.anchor = reverse ? this.origin[1] : this.origin[0];
    node.cursor = reverse ? range[0] : range[1];
  }
  clear(resetClicks = true): void {
    if (resetClicks) this.clicks.clear();
    this.editor = undefined;
    this.selectedText.clear();
    this.dragging = false;
  }
  present(screen: Screen, root: Mounted): void {
    this.screen = screen;
    this.selectedText.present(screen, root);
  }
}

function editorPosition(node: Mounted, event: PointerEvent): number {
  const view = editorView(node);
  if (view.placeholder) return 0;
  const row = Math.max(
    0,
    Math.min(view.lines.length - 1, event.y - node.inner.y),
  );
  const line = view.lines[row];
  return line
    ? line.start +
        take(
          line.text,
          Math.max(
            0,
            event.x -
              node.inner.x -
              textOffset(line.text, node.inner.width, node.style.textAlign),
          ),
        ).length
    : 0;
}
