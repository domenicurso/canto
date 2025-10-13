import type { Size } from "../types";

export function computeStackHeight(
  children: Size[],
  gap: number,
): number {
  if (children.length === 0) {
    return 0;
  }
  const totalHeight = children.reduce((acc, child) => acc + child.height, 0);
  const gaps = Math.max(children.length - 1, 0) * gap;
  return totalHeight + gaps;
}

export function computeStackWidth(
  children: Size[],
  gap: number,
): number {
  if (children.length === 0) {
    return 0;
  }
  const totalWidth = children.reduce((acc, child) => acc + child.width, 0);
  const gaps = Math.max(children.length - 1, 0) * gap;
  return totalWidth + gaps;
}

export function alignOffset(
  container: number,
  content: number,
  align: "left" | "top" | "center" | "right" | "bottom",
): number {
  switch (align) {
    case "center":
      return Math.floor((container - content) / 2);
    case "right":
    case "bottom":
      return container - content;
    case "left":
    case "top":
    default:
      return 0;
  }
}
