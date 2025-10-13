import { clamp } from "./constraints";

import type { Dimension } from "../style";

function parsePercent(value: `${number}%`): number {
  const numeric = Number(value.slice(0, -1));
  return Number.isFinite(numeric) ? numeric / 100 : 0;
}

export function resolveDimension(
  dimension: Dimension | undefined,
  min: number,
  max: number,
  content: number,
): number {
  if (typeof dimension === "number") {
    return clamp(dimension, min, max);
  }

  if (dimension === "fill") {
    return Number.isFinite(max) ? max : content;
  }

  if (dimension === "auto" || dimension === undefined) {
    return clamp(content, min, max);
  }

  if (typeof dimension === "string" && dimension.endsWith("%")) {
    const percentage = parsePercent(dimension as `${number}%`);
    const target = Number.isFinite(max) ? max * percentage : content;
    return clamp(target, min, max);
  }

  return clamp(content, min, max);
}

export function applyMinMax(
  value: number,
  min: number | Dimension | undefined,
  max: number | Dimension | undefined,
): number {
  let minValue = typeof min === "number" ? min : 0;
  let maxValue =
    typeof max === "number"
      ? max
      : typeof max === "number" && Number.isFinite(max)
        ? max
        : Infinity;

  if (typeof min === "string" && min.endsWith("%")) {
    minValue = parsePercent(min as `${number}%`) * value;
  }
  if (typeof max === "string" && max.endsWith("%")) {
    maxValue = parsePercent(max as `${number}%`) * value;
  }

  if (min === "fill") {
    minValue = value;
  }
  if (max === "fill") {
    maxValue = value;
  }

  return clamp(value, minValue, maxValue);
}
