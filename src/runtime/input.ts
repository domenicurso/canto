import { take } from "../text/columns";
import { edit } from "./editing";
import { editorView } from "./editor-view";
import { disabled, Focus, hit } from "./focus";
import { scrollKey, scrollWheel } from "./scroll-input";

import type { KeyEvent, PointerEvent } from "../element/events";
import type { Mounted } from "./tree";

export class InputRouter {
  readonly focus: Focus;
  private pressed: Mounted | undefined;
  constructor(private readonly schedule: () => void) {
    this.focus = new Focus(schedule);
  }
  key(root: Mounted, event: KeyEvent): void {
    let node = this.focus.current ?? root;
    while (node) {
      node.element.data.props.onKey?.(event);
      if (!event.defaultPrevented && this.defaultKey(node, event)) event.preventDefault();
      if (event.propagationStopped) break;
      if (!node.parent) break;
      node = node.parent;
    }
    if (!event.defaultPrevented && event.key === "tab") this.focus.next(root, event.shift);
    this.schedule();
  }
  private defaultKey(node: Mounted, event: KeyEvent): boolean {
    if (disabled(node)) return false;
    if (node.element.data.props.input) return edit(node, event);
    if (node.element.data.props.button && ["enter", " "].includes(event.key)) {
      node.element.data.props.button.onPress();
      return true;
    }
    if (node.element.data.kind === "scroll") return scrollKey(node, event);
    return false;
  }
  mouse(root: Mounted, event: PointerEvent): void {
    const target = hit(root, event, root.rect);
    this.hover(root, target);
    let node = target;
    while (node) {
      node.element.data.props.onMouse?.(event);
      if (event.action === "scroll" && node.element.data.kind === "scroll") {
        scrollWheel(node, event);
        break;
      }
      if (
        event.action === "press" &&
        (node.element.data.props.button || node.element.data.props.input)
      ) {
        this.press(node, event);
        break;
      }
      node = node.parent ?? undefined;
    }
    if (event.action === "release") this.release(target);
    this.schedule();
  }
  private press(node: Mounted, event: PointerEvent): void {
    if (disabled(node)) return;
    this.focus.set(node);
    if (node.element.data.props.input) {
      const line = editorView(node).lines[Math.max(0, event.y - node.inner.y)];
      if (line)
        node.cursor = line.start + take(line.text, Math.max(0, event.x - node.inner.x)).length;
      node.anchor = null;
    }
    node.pressed = true;
    this.pressed = node;
  }
  private release(target: Mounted | undefined): void {
    const pressed = this.pressed;
    if (!pressed) return;
    pressed.pressed = false;
    this.pressed = undefined;
    let node = target;
    while (node && node !== pressed) node = node.parent ?? undefined;
    if (node === pressed && !disabled(pressed)) pressed.element.data.props.button?.onPress();
  }
  private hover(node: Mounted, target: Mounted | undefined): void {
    let ancestor = target;
    node.hovered = false;
    while (ancestor) {
      if (ancestor === node) node.hovered = true;
      ancestor = ancestor.parent ?? undefined;
    }
    for (const child of node.children) this.hover(child, target);
  }
}
