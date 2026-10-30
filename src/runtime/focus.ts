import type { Rect } from "../layout/geometry";
import type { Mounted } from "./tree";

import { contains, intersect } from "../layout/geometry";
import { guard } from "./error-boundary";
import { overlays, inside } from "./overlays";
import { walk } from "./tree";

export function disabled(node: Mounted): boolean {
  return Boolean(
    node.element.data.props.input?.disabled ||
    node.element.data.props.button?.disabled,
  );
}
export function focusable(node: Mounted): boolean {
  const { kind, props } = node.element.data;
  return (
    !disabled(node) &&
    (props.focusable ??
      ["button", "input", "textarea", "scroll"].includes(kind))
  );
}
export class Focus {
  current: Mounted | undefined;
  scope: Mounted | undefined;
  constructor(private readonly schedule: () => void) {}
  set(node: Mounted | undefined): void {
    if (node && this.scope && !inside(node, this.scope)) return;
    if (node === this.current || (node && !focusable(node))) return;
    const previous = this.current;
    this.current = node;
    if (previous) {
      previous.interaction.focused = false;
      guard(previous, () => previous.element.data.props.onBlur?.());
    }
    if (node) {
      node.interaction.focused = true;
      guard(node, () => node.element.data.props.onFocus?.());
      this.reveal(node);
    }
    this.schedule();
  }
  refresh(root: Mounted): void {
    const nodes = walk(this.scope ?? root);
    if (this.current && (!this.current.active || !focusable(this.current)))
      this.set(undefined);
    if (!this.current)
      this.set(
        nodes.find(
          (node) => node.element.data.props.autoFocus && focusable(node),
        ),
      );
  }
  next(root: Mounted, reverse: boolean): void {
    const nodes = walk(this.scope ?? root)
      .filter(
        (node) =>
          focusable(node) && (node.element.data.props.tabIndex ?? 0) >= 0,
      )
      .sort(
        (a, b) =>
          (a.element.data.props.tabIndex ?? 0) -
          (b.element.data.props.tabIndex ?? 0),
      );
    if (!nodes.length) return;
    const current = this.current ? nodes.indexOf(this.current) : -1;
    const index =
      current < 0
        ? reverse
          ? nodes.length - 1
          : 0
        : (current + (reverse ? -1 : 1) + nodes.length) % nodes.length;
    this.set(nodes[index]);
  }
  private reveal(node: Mounted): void {
    let ancestor = node.parent;
    while (ancestor) {
      if (ancestor.element.data.props.overlay) break;
      if (ancestor.element.data.kind === "scroll") {
        const delta =
          node.layout.rect.y < ancestor.layout.inner.y
            ? node.layout.rect.y - ancestor.layout.inner.y
            : Math.max(
                0,
                node.layout.rect.y +
                  node.layout.rect.height -
                  ancestor.layout.inner.y -
                  ancestor.layout.inner.height,
              );
        if (delta) setScroll(ancestor, ancestor.scrolling.offset + delta);
      }
      ancestor = ancestor.parent;
    }
  }
}
export function setScroll(
  node: Mounted,
  offset: number | { x: number; y: number },
): void {
  const props = node.element.data.props.scroll;
  if (!props) return;
  const next = Math.max(
    0,
    Math.min(
      node.scrolling.maxOffset,
      Math.floor(typeof offset === "number" ? offset : offset.y),
    ),
  );
  const x = Math.max(
    0,
    Math.min(
      node.scrolling.maxOffsetX,
      typeof offset === "number"
        ? props.axis === "horizontal"
          ? next
          : node.scrolling.offsetX
        : Math.floor(offset.x),
    ),
  );
  if (props.offset === undefined) {
    node.scrolling.offset = next;
    node.scrolling.offsetX = x;
  }
  guard(node, () => {
    if (props.axis === "both") props.onScroll?.({ x, y: next });
    else props.onScroll?.(props.axis === "horizontal" ? x : next);
  });
}
export function hit(
  node: Mounted,
  point: { x: number; y: number },
  clip: Rect,
): Mounted | undefined {
  if (!contains(clip, point.x, point.y)) return undefined;
  if (!node.parent) {
    for (const layer of overlays(node).reverse()) {
      const target = hit(layer, point, clip);
      if (target) return target;
    }
  }
  const own = intersect(clip, node.layout.rect);
  const childClip =
    node.layout.style.overflow === "visible" &&
    node.element.data.kind !== "scroll"
      ? clip
      : intersect(clip, node.layout.inner);
  const children = [...node.children]
    .sort((a, b) => (a.layout.style.zIndex ?? 0) - (b.layout.style.zIndex ?? 0))
    .reverse();
  for (const child of children) {
    if (child.element.data.props.overlay) continue;
    const target = hit(child, point, childClip);
    if (target) return target;
  }
  return contains(own, point.x, point.y) ? node : undefined;
}

export function keyboardRoot(root: Mounted): Mounted {
  let node = root;
  while (node.element.data.kind === "component" && node.children.length === 1) {
    const child = node.children[0];
    if (!child) break;
    node = child;
  }
  return node;
}
