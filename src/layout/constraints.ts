import type { Size } from "../types";

export interface Constraints {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
}

export function constraints(
  minWidth = 0,
  maxWidth = Infinity,
  minHeight = 0,
  maxHeight = Infinity,
): Constraints {
  return {
    minWidth,
    maxWidth,
    minHeight,
    maxHeight,
  };
}

export function tight(width: number, height: number): Constraints {
  return {
    minWidth: width,
    maxWidth: width,
    minHeight: height,
    maxHeight: height,
  };
}

export function loose(maxWidth: number, maxHeight: number): Constraints {
  return {
    minWidth: 0,
    maxWidth,
    minHeight: 0,
    maxHeight,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clampSize(size: Size, c: Constraints): Size {
  return {
    width: clamp(size.width, c.minWidth, c.maxWidth),
    height: clamp(size.height, c.minHeight, c.maxHeight),
  };
}
