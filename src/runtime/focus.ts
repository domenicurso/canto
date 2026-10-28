import type { Mounted, Rect } from "./tree";

import { contains, intersect } from "../layout/geometry";
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
  constructor(private readonly schedule: () => void) {}
  set(node: Mounted | undefined): void {
    if (node === this.current || (node && !focusable(node))) return;
    const previous = this.current;
    this.current = node;
    if (previous) {
      previous.focused = false;
      previous.element.data.props.onBlur?.();
    }
    if (node) {
      node.focused = true;
      node.element.data.props.onFocus?.();
      this.reveal(node);
    }
    this.schedule();
  }
  refresh(root: Mounted): void {
    const nodes = walk(root);
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
    const nodes = walk(root)
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
      if (ancestor.element.data.kind === "scroll") {
        const delta =
          node.rect.y < ancestor.inner.y
            ? node.rect.y - ancestor.inner.y
            : Math.max(
                0,
                node.rect.y +
                  node.rect.height -
                  ancestor.inner.y -
                  ancestor.inner.height,
              );
        if (delta) setScroll(ancestor, ancestor.offset + delta);
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
      node.maxOffset,
      Math.floor(typeof offset === "number" ? offset : offset.y),
    ),
  );
  const x = Math.max(
    0,
    Math.min(
      node.maxOffsetX,
      typeof offset === "number"
        ? props.axis === "horizontal"
          ? next
          : node.offsetX
        : Math.floor(offset.x),
    ),
  );
  if (props.offset === undefined) {
    node.offset = next;
    node.offsetX = x;
  }
  if (props.axis === "both") props.onScroll?.({ x, y: next });
  else props.onScroll?.(props.axis === "horizontal" ? x : next);
}
export function hit(
  node: Mounted,
  point: { x: number; y: number },
  clip: Rect,
): Mounted | undefined {
  if (!contains(clip, point.x, point.y)) return undefined;
  const own = intersect(clip, node.rect);
  const childClip =
    node.style.overflow === "visible" && node.element.data.kind !== "scroll"
      ? clip
      : intersect(clip, node.inner);
  const children = [...node.children]
    .sort((a, b) => (a.style.zIndex ?? 0) - (b.style.zIndex ?? 0))
    .reverse();
  for (const child of children) {
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
