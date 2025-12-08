import { clamp } from "./constraints";

import type { DimensionLimitToken, DimensionToken } from "../style";

export function parsePercent(token: `${number}%`): number {
  const numeric = Number(token.slice(0, -1));
  return Number.isFinite(numeric) ? numeric / 100 : 0;
}

export function parseFraction(token: `${number}fr`): number {
  const numeric = Number(token.slice(0, -2));
  return Number.isFinite(numeric) ? numeric : 0;
}

export function safeFloor(value: number): number {
  if (!Number.isFinite(value)) {
    return value;
  }
  return Math.floor(value);
}

function availableForLimit(
  constraintMin: number,
  constraintMax: number,
  fallback: number,
): number {
  if (Number.isFinite(constraintMax)) {
    return constraintMax;
  }
  if (Number.isFinite(fallback)) {
    return fallback;
  }
  if (Number.isFinite(constraintMin) && constraintMin > 0) {
    return constraintMin;
  }
  return Infinity;
}

export function resolveOuterDimensionCandidate(
  token: DimensionToken,
  min: number,
  max: number,
  styleMin?: DimensionLimitToken,
  styleMax?: DimensionLimitToken,
): number {
  const upper = Number.isFinite(max) ? max : Infinity;

  // Apply style's own max constraint to limit the effective max
  let effectiveMax = max;
  if (
    styleMax !== undefined &&
    styleMax !== "none" &&
    typeof styleMax === "number"
  ) {
    effectiveMax = Number.isFinite(max) ? Math.min(max, styleMax) : styleMax;
  }

  // Apply style's own min constraint to raise the effective min
  let effectiveMin = min;
  if (
    styleMin !== undefined &&
    styleMin !== "none" &&
    typeof styleMin === "number"
  ) {
    effectiveMin = Math.max(min, styleMin);
  }

  const effectiveUpper = Number.isFinite(effectiveMax)
    ? effectiveMax
    : Infinity;

  if (typeof token === "number") {
    return clamp(Math.max(0, Math.floor(token)), effectiveMin, effectiveMax);
  }
  if (typeof token === "string") {
    if (token === "hug" || token === "auto" || token === "lock") {
      return clamp(effectiveUpper, effectiveMin, effectiveMax);
    }
    if (token === "fill" || token.endsWith("fr")) {
      return clamp(effectiveUpper, effectiveMin, effectiveMax);
    }
    if (token.endsWith("%")) {
      if (Number.isFinite(effectiveUpper)) {
        const percentage = parsePercent(token as `${number}%`);
        return clamp(
          safeFloor(effectiveUpper * percentage),
          effectiveMin,
          effectiveMax,
        );
      }
      return clamp(effectiveMin, effectiveMin, effectiveMax);
    }
  }
  return clamp(effectiveUpper, effectiveMin, effectiveMax);
}

export function resolveLimitValue(
  token: DimensionLimitToken,
  intrinsic: number,
  containerSize: number,
  constraintMin: number,
  constraintMax: number,
  type: "min" | "max",
): number | undefined {
  if (token === "none") {
    return type === "min" ? 0 : Infinity;
  }
  if (typeof token === "number") {
    return Math.max(0, Math.floor(token));
  }
  const available = availableForLimit(
    constraintMin,
    constraintMax,
    containerSize,
  );
  if (token === "hug" || token === "auto" || token === "lock") {
    return intrinsic;
  }
  if (token === "fill") {
    return available;
  }
  if (token.endsWith("%")) {
    if (Number.isFinite(available)) {
      return safeFloor(available * parsePercent(token as `${number}%`));
    }
    return type === "min" ? 0 : Infinity;
  }
  if (token.endsWith("fr")) {
    return available;
  }
  return undefined;
}

export function clampDimension(
  value: number,
  minToken: DimensionLimitToken,
  maxToken: DimensionLimitToken,
  intrinsic: number,
  containerSize: number,
  constraintMin: number,
  constraintMax: number,
): number {
  let minBound = resolveLimitValue(
    minToken,
    intrinsic,
    containerSize,
    constraintMin,
    constraintMax,
    "min",
  );
  let maxBound = resolveLimitValue(
    maxToken,
    intrinsic,
    containerSize,
    constraintMin,
    constraintMax,
    "max",
  );

  if (minBound !== undefined && maxBound !== undefined) {
    if (minBound > maxBound) {
      if (maxToken !== "none") {
        minBound = maxBound;
      } else {
        maxBound = minBound;
      }
    }
  }

  let result = value;
  if (minBound !== undefined) {
    result = Math.max(result, minBound);
  }
  if (maxBound !== undefined) {
    result = Math.min(result, maxBound);
  }
  result = clamp(result, constraintMin, constraintMax);
  return Math.max(0, Math.floor(result));
}

export function resolveDimensionBound(
  token: DimensionLimitToken,
  intrinsic: number,
  containerSize: number,
  type: "min" | "max",
): number | undefined {
  if (token === "none") {
    return type === "min" ? 0 : Infinity;
  }
  if (typeof token === "number") {
    return Math.max(0, Math.floor(token));
  }
  if (token === "hug" || token === "auto" || token === "lock") {
    return intrinsic;
  }
  if (token === "fill") {
    return containerSize;
  }
  if (token.endsWith("%")) {
    if (Number.isFinite(containerSize)) {
      return safeFloor(containerSize * parsePercent(token as `${number}%`));
    }
    return type === "min" ? 0 : Infinity;
  }
  if (token.endsWith("fr")) {
    return containerSize;
  }
  return undefined;
}
