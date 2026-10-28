import type { PointerEvent } from "../element/events";
import type { Mounted } from "./tree";

import { disabled, Focus } from "./focus";
import { Selection } from "./selection";

/** Pointer capture, hover, and selection share a lifetime when mouse ownership changes. */
export class PointerState {
  readonly selection = new Selection();
  private hovered: Mounted[] = [];
  private pressed: Mounted | undefined;
  constructor(private readonly focus: Focus) {}
  clear(): void {
    if (this.pressed) this.pressed.pressed = false;
    this.pressed = undefined;
    this.hover(undefined);
    this.selection.clear();
    if (this.focus.current) this.focus.current.anchor = null;
  }
  select(target: Mounted | undefined, event: PointerEvent): void {
    if (event.action === "press" && event.button === 0) {
      let owner = target;
      while (
        owner &&
        !owner.element.data.props.input &&
        !owner.element.data.props.button
      )
        owner = owner.parent ?? undefined;
      if (owner?.element.data.props.input && !disabled(owner)) {
        this.focus.set(owner);
        this.selection.press(owner, event);
      } else if (!owner) {
        this.focus.set(undefined);
        this.selection.press(target, event);
      }
    }
  }
  press(node: Mounted, event: PointerEvent): void {
    if (disabled(node) || event.button !== 0) return;
    this.focus.set(node);
    node.pressed = true;
    this.pressed = node;
  }
  release(target: Mounted | undefined): void {
    const pressed = this.pressed;
    if (!pressed) return;
    pressed.pressed = false;
    this.pressed = undefined;
    let node = target;
    while (node && node !== pressed) node = node.parent ?? undefined;
    if (node === pressed && !disabled(pressed))
      pressed.element.data.props.button?.onPress();
  }
  hover(target: Mounted | undefined): void {
    for (const node of this.hovered) node.hovered = false;
    this.hovered = [];
    for (let node = target; node; node = node.parent ?? undefined) {
      node.hovered = true;
      this.hovered.push(node);
    }
  }
}
