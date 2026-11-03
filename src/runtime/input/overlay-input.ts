import type { KeyEvent, PointerEvent } from "../../element/events";
import type { Mounted } from "../components/tree";
import type { Focus } from "./focus";

import { contains } from "../../layout/geometry";
import { guard } from "../components/error-boundary";
import { walk } from "../components/tree";
import { inside, overlays } from "../overlays";
import { focusable } from "./focus";

export class OverlayInput {
  private opened = new Map<Mounted, Mounted | undefined>();
  private layers: Mounted[] = [];
  constructor(private readonly focus: Focus) {}
  refresh(root: Mounted): void {
    this.layers = overlays(root);
    const modal = this.layers.findLast(
      (node) => node.element.data.props.overlay?.modal,
    );
    this.focus.scope = modal;
    for (const [node, previous] of [...this.opened].reverse()) {
      if (node.active && this.layers.includes(node)) continue;
      this.opened.delete(node);
      if (inside(this.focus.current, node) && previous?.active)
        this.focus.set(previous);
    }
    for (const node of this.layers) {
      if (this.opened.has(node)) continue;
      this.opened.set(node, this.focus.current);
      if (node.element.data.props.overlay?.focus === "first")
        this.focus.set(walk(node).find(focusable), "automatic");
    }
    if (modal && !inside(this.focus.current, modal)) {
      const controls = walk(modal).filter(focusable);
      this.focus.set(
        modal.element.data.props.overlay?.focus === "none"
          ? modal
          : (controls.find((node) => node.element.data.props.autoFocus) ??
              controls.find((node) => node !== modal) ??
              modal),
        "automatic",
      );
    }
  }
  key(event: KeyEvent): boolean {
    const owner = this.layers.at(-1);
    const top = owner?.element.data.props.overlay;
    if (
      !owner ||
      event.key !== "escape" ||
      !top?.onDismiss ||
      top.dismissOnEscape === false
    )
      return false;
    event.preventDefault();
    guard(owner, () => top.onDismiss?.());
    return true;
  }
  mouse(event: PointerEvent): boolean {
    const top = this.layers.at(-1);
    const options = top?.element.data.props.overlay;
    if (top && !contains(top.layout.rect, event.x, event.y)) {
      if (
        event.action === "press" &&
        options?.onDismiss &&
        options.dismissOnOutside !== false
      ) {
        guard(top, () => options.onDismiss?.());
        return true;
      }
      return Boolean(this.focus.scope);
    }
    return false;
  }
}
