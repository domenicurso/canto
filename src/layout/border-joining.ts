import type { Mounted } from "../runtime/tree";

import { edges } from "./geometry";

/** A decoration-free component wrapper may expose its single child's border. */
export function borderOwner(node: Mounted): Mounted | undefined {
  if (node.layout.style.border && node.layout.style.border !== "none")
    return node;
  if (
    node.element.data.kind !== "component" ||
    node.children.length !== 1 ||
    edges(node.layout.style).some(Boolean)
  )
    return undefined;
  const child = node.children[0];
  return child?.layout.style.width === "fill" &&
    child.layout.style.height === "fill"
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
    !parent?.layout.style.joinBorders ||
    axisGap(parent, horizontal) !== 0 ||
    !["row", "column"].includes(parent.element.data.kind)
  )
    return 0;
  const a = borderOwner(previous),
    b = borderOwner(next);
  if (
    !a ||
    !b ||
    typeof a.layout.style.border === "object" ||
    typeof b.layout.style.border === "object"
  )
    return 0;
  const axis = horizontal ? "width" : "height";
  const maximum = horizontal ? "maxWidth" : "maxHeight";
  if (
    [previous, next, a, b].some(
      (node) =>
        node.layout.style[axis] === 0 ||
        node.layout.style[axis] === "0%" ||
        node.layout.style[maximum] === 0,
    )
  )
    return 0;
  return Number(
    horizontal
      ? a.layout.style.borderRight !== false &&
          b.layout.style.borderLeft !== false
      : a.layout.style.borderBottom !== false &&
          b.layout.style.borderTop !== false,
  );
}
export function flowGaps(
  children: readonly Mounted[],
  horizontal: boolean,
): number {
  const parent = children[0]?.parent;
  const gap = parent ? axisGap(parent, horizontal) : 0;
  return children.reduce(
    (sum, node, index) =>
      index
        ? sum + gap - borderOverlap(children[index - 1], node, horizontal)
        : sum,
    0,
  );
}

export function axisGap(node: Mounted, horizontal: boolean): number {
  return (
    (horizontal ? node.layout.style.columnGap : node.layout.style.rowGap) ??
    node.layout.style.gap ??
    0
  );
}
