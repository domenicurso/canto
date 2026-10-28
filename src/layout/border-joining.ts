import type { Mounted } from "../runtime/tree";

import { edges } from "./geometry";

/** A decoration-free component wrapper may expose its single child's border. */
export function borderOwner(node: Mounted): Mounted | undefined {
  if (node.style.border && node.style.border !== "none") return node;
  if (
    node.element.data.kind !== "component" ||
    node.children.length !== 1 ||
    edges(node.style).some(Boolean)
  )
    return undefined;
  const child = node.children[0];
  return child?.style.width === "fill" && child.style.height === "fill"
    ? borderOwner(child)
    : undefined;
}
export function borderOverlap(
  previous: Mounted | undefined,
  next: Mounted,
  horizontal: boolean,
): number {
  const parent = next.parent;
  if (
    !previous ||
    !parent?.style.joinBorders ||
    (parent.style.gap ?? 0) !== 0 ||
    !["row", "column"].includes(parent.element.data.kind)
  )
    return 0;
  const a = borderOwner(previous),
    b = borderOwner(next);
  if (!a || !b) return 0;
  const axis = horizontal ? "width" : "height";
  const maximum = horizontal ? "maxWidth" : "maxHeight";
  if (
    [previous, next, a, b].some(
      (node) =>
        node.style[axis] === 0 ||
        node.style[axis] === "0%" ||
        node.style[maximum] === 0,
    )
  )
    return 0;
  return Number(
    horizontal
      ? a.style.borderRight !== false && b.style.borderLeft !== false
      : a.style.borderBottom !== false && b.style.borderTop !== false,
  );
}
export function flowGaps(
  children: readonly Mounted[],
  horizontal: boolean,
): number {
  const gap = children[0]?.parent?.style.gap ?? 0;
  return children.reduce(
    (sum, node, index) =>
      index
        ? sum + gap - borderOverlap(children[index - 1], node, horizontal)
        : sum,
    0,
  );
}
