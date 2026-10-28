import { measure } from "./measure";

import type { Mounted } from "../runtime/tree";
import type { Size } from "./geometry";

export interface Allocation {
  node: Mounted;
  size: Size;
  flow: number;
  min: number;
  max: number;
  grow: number;
  shrink: number;
}
export function allocate(children: Mounted[], available: Size, horizontal: boolean): Allocation[] {
  const axis = horizontal ? "width" : "height";
  const result = children.map((node) => {
    const s = node.style;
    const size = measure(node, available);
    const fill = s[axis] === "fill";
    const min = (horizontal ? s.minWidth : s.minHeight) ?? 0;
    const max = (horizontal ? s.maxWidth : s.maxHeight) ?? Infinity;
    const token = s[axis];
    return {
      node,
      size,
      flow: fill ? min : size[axis],
      min,
      max,
      grow: s.grow ?? (fill ? 1 : 0),
      shrink: s.shrink ?? (typeof token === "number" ? 0 : 1),
    };
  });
  const gap = children[0]?.parent?.style.gap ?? 0;
  const remaining =
    available[axis] -
    gap * Math.max(0, children.length - 1) -
    result.reduce((sum, item) => sum + item.flow, 0);
  distribute(result, remaining);
  return result;
}
function distribute(items: Allocation[], free: number): void {
  const growing = free > 0;
  let remaining = Math.abs(Math.floor(free));
  if (!Number.isFinite(remaining)) return;
  while (remaining > 0) {
    const eligible = items.filter((item) =>
      growing ? item.grow > 0 && item.flow < item.max : item.shrink > 0 && item.flow > item.min,
    );
    if (!eligible.length) break;
    const total = eligible.reduce((sum, item) => sum + (growing ? item.grow : item.shrink), 0);
    const budget = remaining;
    for (const item of eligible) {
      const weight = growing ? item.grow : item.shrink;
      const capacity = growing ? item.max - item.flow : item.flow - item.min;
      const share = Math.min(
        remaining,
        capacity,
        Math.max(1, Math.floor((budget * weight) / total)),
      );
      item.flow += growing ? share : -share;
      remaining -= share;
    }
  }
}
