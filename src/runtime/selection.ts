import type { PointerEvent } from "../element/events";
import type { Screen } from "../render/screen";
import type { Mounted } from "./tree";

import { content } from "../layout/measure";
import { take } from "../text/columns";
import { editorView } from "./editor-view";
import { TextSelection } from "./text-selection";

export class Selection {
  private editor?: Mounted;
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
    this.clear();
    if (event.button !== 0 || !node) return;
    this.dragging = true;
    if (node.element.data.props.input) {
      this.editor = node;
      node.cursor = editorPosition(node, event);
      node.anchor = node.cursor;
    } else
      this.dragging = this.screen
        ? this.selectedText.press(node, event, this.screen)
        : false;
  }
  move(event: PointerEvent): boolean {
    if (!this.dragging) return false;
    if (this.editor?.active)
      this.editor.cursor = editorPosition(this.editor, event);
    else this.selectedText.move(event);
    if (event.action === "release") this.dragging = false;
    return true;
  }
  clear(): void {
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
    ? line.start + take(line.text, Math.max(0, event.x - node.inner.x)).length
    : 0;
}
