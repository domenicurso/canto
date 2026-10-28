import { padding } from "../style/types";

import type { Rect } from "../runtime/tree";
import type { Dimension, Style } from "../style/types";

export interface Size {
  width: number;
  height: number;
}
export function edges(style: Style): readonly [number, number, number, number] {
  const inset = style.border && style.border !== "none" ? 1 : 0;
  const p = padding(style.padding);
  return [
    p[0] + (style.borderTop === false ? 0 : inset),
    p[1] + (style.borderRight === false ? 0 : inset),
    p[2] + (style.borderBottom === false ? 0 : inset),
    p[3] + (style.borderLeft === false ? 0 : inset),
  ];
}
export function inset(rect: Rect, style: Style): Rect {
  const [top, right, bottom, left] = edges(style);
  return {
    x: rect.x + left,
    y: rect.y + top,
    width: Math.max(0, rect.width - left - right),
    height: Math.max(0, rect.height - top - bottom),
  };
}
export function dimension(token: Dimension | undefined, available: number): number | undefined {
  if (typeof token === "number") return Math.max(0, Math.floor(token));
  if (token === "fill") return Number.isFinite(available) ? available : undefined;
  if (token?.endsWith("%") && Number.isFinite(available))
    return Math.max(0, Math.floor((available * Number.parseFloat(token)) / 100));
  return undefined;
}
export function bounded(value: number, min = 0, max = Infinity): number {
  return Math.max(0, Math.floor(Math.max(min, Math.min(max, value))));
}
export function intersect(a: Rect, b: Rect): Rect {
  const x = Math.max(a.x, b.x),
    y = Math.max(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(0, Math.min(a.x + a.width, b.x + b.width) - x),
    height: Math.max(0, Math.min(a.y + a.height, b.y + b.height) - y),
  };
}
export function contains(rect: Rect, x: number, y: number): boolean {
  return x >= rect.x && y >= rect.y && x < rect.x + rect.width && y < rect.y + rect.height;
}
