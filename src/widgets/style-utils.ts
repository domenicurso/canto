import { clampDimension, parsePercent, safeFloor } from "../layout/dimension";

import type {
  CrossAlignment,
  DimensionLimitToken,
  DimensionToken,
  FlowDistribution,
} from "../style";

export function resolveAxisSize(
  token: DimensionToken,
  minToken: DimensionLimitToken,
  maxToken: DimensionLimitToken,
  intrinsic: number,
  constraintMin: number,
  constraintMax: number,
): number {
  let base = intrinsic;

  if (typeof token === "number") {
    base = Math.max(0, Math.floor(token));
  } else {
    switch (token) {
      case "hug":
      case "auto":
      case "lock":
        base = intrinsic;
        break;
      case "fill":
        base = Number.isFinite(constraintMax) ? constraintMax : intrinsic;
        break;
      default:
        if (token.endsWith("%")) {
          if (Number.isFinite(constraintMax)) {
            base = safeFloor(
              constraintMax * parsePercent(token as `${number}%`),
            );
          } else {
            base = intrinsic;
          }
        } else if (token.endsWith("fr")) {
          base = Number.isFinite(constraintMax) ? constraintMax : intrinsic;
        }
        break;
    }
  }

  if (!Number.isFinite(base)) {
    base = intrinsic;
  }

  return clampDimension(
    base,
    minToken,
    maxToken,
    intrinsic,
    constraintMax,
    constraintMin,
    constraintMax,
  );
}

export function horizontalAlignFromDistribute(
  distribute: FlowDistribution,
): CrossAlignment {
  if (distribute === "center" || distribute === "end") {
    return distribute;
  }
  return "start";
}

export function normalizeCrossAlign(align: CrossAlignment): CrossAlignment {
  if (align === "stretch") {
    return "start";
  }
  return align;
}
