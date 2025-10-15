import { clamp } from "./constraints";
import {
  clampDimension,
  parseFraction,
  parsePercent,
  resolveDimensionBound,
  resolveOuterDimensionCandidate,
  safeFloor,
} from "./dimension";

import type {
  BoxPadding,
  CrossAlignment,
  DimensionLimitToken,
  DimensionToken,
  FlowAxis,
  FlowDistribution,
  ResolvedStyle,
} from "../style";
import type { Point, Size } from "../types";
import type { Constraints } from "./constraints";

type SizeKey = "width" | "height";
type PointKey = "x" | "y";

interface StackMeasuredChild {
  intrinsicSize: Size;
  style: ResolvedStyle;
}

export interface PreparedStackMeasurement {
  candidateSize: Size;
  innerConstraints: Constraints;
}

export interface StackMeasurement {
  axis: FlowAxis;
  padding: BoxPadding;
  gap: number;
  distribute: FlowDistribution;
  align: CrossAlignment;
  candidateSize: Size;
  outerSize: Size;
  innerSize: Size;
  intrinsicOuterSize: Size;
  intrinsicInnerFlow: number;
  intrinsicInnerCross: number;
  items: StackMeasuredChild[];
}

export interface StackLayoutItem {
  origin: Point;
  size: Size;
}

export interface StackLayoutResult {
  items: StackLayoutItem[];
  overflow: number;
  freeSpace: number;
}

const SIZE_KEYS: Record<FlowAxis, { flow: SizeKey; cross: SizeKey }> = {
  x: { flow: "width", cross: "height" },
  y: { flow: "height", cross: "width" },
};

const POINT_KEYS: Record<FlowAxis, { flow: PointKey; cross: PointKey }> = {
  x: { flow: "x", cross: "y" },
  y: { flow: "y", cross: "x" },
};

function paddingAlongAxis(padding: BoxPadding, axis: FlowAxis): number {
  return axis === "x"
    ? padding.left + padding.right
    : padding.top + padding.bottom;
}

function resolveOuterBaseSize(
  token: DimensionToken,
  intrinsic: number,
  candidate: number,
): number {
  if (typeof token === "number") {
    return Math.max(0, Math.floor(token));
  }
  if (token === "hug" || token === "auto" || token === "lock") {
    return intrinsic;
  }
  if (token === "fill" || token.endsWith("fr")) {
    return Number.isFinite(candidate) ? candidate : intrinsic;
  }
  if (token.endsWith("%")) {
    if (Number.isFinite(candidate)) {
      return safeFloor(candidate * parsePercent(token as `${number}%`));
    }
    return intrinsic;
  }
  return Number.isFinite(candidate) ? candidate : intrinsic;
}

export function prepareStackMeasurement(
  axis: FlowAxis,
  constraints: Constraints,
  style: ResolvedStyle,
): PreparedStackMeasurement {
  const widthCandidate = resolveOuterDimensionCandidate(
    style.width,
    constraints.minWidth,
    constraints.maxWidth,
  );
  const heightCandidate = resolveOuterDimensionCandidate(
    style.height,
    constraints.minHeight,
    constraints.maxHeight,
  );

  const horizontalPadding = paddingAlongAxis(style.padding, "x");
  const verticalPadding = paddingAlongAxis(style.padding, "y");

  const innerWidth = Math.max(widthCandidate - horizontalPadding, 0);
  const innerHeight = Math.max(heightCandidate - verticalPadding, 0);

  return {
    candidateSize: {
      width: widthCandidate,
      height: heightCandidate,
    },
    innerConstraints: {
      minWidth: 0,
      maxWidth: innerWidth,
      minHeight: 0,
      maxHeight: innerHeight,
    },
  };
}

export function finalizeStackMeasurement(
  axis: FlowAxis,
  constraints: Constraints,
  style: ResolvedStyle,
  candidateSize: Size,
  childSizes: readonly Size[],
  childStyles: readonly ResolvedStyle[],
): StackMeasurement {
  const gapTotal = style.gap * Math.max(childSizes.length - 1, 0);
  const sizeKey = SIZE_KEYS[axis];
  const flowSizes = childSizes.map((size) => size[sizeKey.flow]);
  const crossSizes = childSizes.map((size) => size[sizeKey.cross]);

  const intrinsicInnerFlow =
    flowSizes.reduce((acc, value) => acc + value, 0) + gapTotal;
  const intrinsicInnerCross = crossSizes.reduce(
    (max, value) => Math.max(max, value),
    0,
  );

  const horizontalPadding = paddingAlongAxis(style.padding, "x");
  const verticalPadding = paddingAlongAxis(style.padding, "y");

  const intrinsicInnerWidth =
    axis === "x" ? intrinsicInnerFlow : intrinsicInnerCross;
  const intrinsicInnerHeight =
    axis === "x" ? intrinsicInnerCross : intrinsicInnerFlow;

  const intrinsicOuterSize: Size = {
    width: intrinsicInnerWidth + horizontalPadding,
    height: intrinsicInnerHeight + verticalPadding,
  };

  const baseWidth = resolveOuterBaseSize(
    style.width,
    intrinsicOuterSize.width,
    candidateSize.width,
  );
  const widthContainerSize = Number.isFinite(candidateSize.width)
    ? candidateSize.width
    : baseWidth;
  const finalWidth = clampDimension(
    baseWidth,
    style.minWidth,
    style.maxWidth,
    intrinsicOuterSize.width,
    widthContainerSize,
    constraints.minWidth,
    constraints.maxWidth,
  );

  const baseHeight = resolveOuterBaseSize(
    style.height,
    intrinsicOuterSize.height,
    candidateSize.height,
  );
  const heightContainerSize = Number.isFinite(candidateSize.height)
    ? candidateSize.height
    : baseHeight;
  const finalHeight = clampDimension(
    baseHeight,
    style.minHeight,
    style.maxHeight,
    intrinsicOuterSize.height,
    heightContainerSize,
    constraints.minHeight,
    constraints.maxHeight,
  );

  const outerSize: Size = {
    width: finalWidth,
    height: finalHeight,
  };

  const innerSize: Size = {
    width: Math.max(outerSize.width - horizontalPadding, 0),
    height: Math.max(outerSize.height - verticalPadding, 0),
  };

  const items: StackMeasuredChild[] = childSizes.map((size, index) => ({
    intrinsicSize: size,
    style: childStyles[index] ?? style,
  }));

  return {
    axis,
    padding: { ...style.padding },
    gap: style.gap,
    distribute: style.distribute,
    align: style.align,
    candidateSize,
    outerSize,
    innerSize,
    intrinsicOuterSize,
    intrinsicInnerFlow,
    intrinsicInnerCross,
    items,
  };
}

interface FlowMetrics {
  size: number;
  min: number;
  max: number;
  grow: number;
  shrink: number;
  lock: boolean;
}

interface CrossMetrics {
  size: number;
  min: number;
  max: number;
  allowStretch: boolean;
  lock: boolean;
  align: CrossAlignment;
}

function defaultWeights(token: DimensionToken): {
  grow: number;
  shrink: number;
} {
  if (typeof token === "number") {
    return { grow: 0, shrink: 0 };
  }
  switch (token) {
    case "hug":
    case "auto":
    case "lock":
      return { grow: 0, shrink: 0 };
    case "fill":
      return { grow: 1, shrink: 1 };
    default:
      if (token.endsWith("%")) {
        return { grow: 0, shrink: 1 };
      }
      if (token.endsWith("fr")) {
        const weight = parseFraction(token as `${number}fr`);
        return { grow: weight > 0 ? weight : 0, shrink: 1 };
      }
      return { grow: 0, shrink: 0 };
  }
}

function computeFlowMetrics(
  axis: FlowAxis,
  item: StackMeasuredChild,
  innerFlowSize: number,
): FlowMetrics {
  const sizeKey = SIZE_KEYS[axis];
  const flowToken = axis === "x" ? item.style.width : item.style.height;
  const minToken = axis === "x" ? item.style.minWidth : item.style.minHeight;
  const maxToken = axis === "x" ? item.style.maxWidth : item.style.maxHeight;

  const intrinsic = item.intrinsicSize[sizeKey.flow];
  const defaults = defaultWeights(flowToken);

  let basis = intrinsic;
  let lock = false;

  if (typeof flowToken === "number") {
    basis = Math.max(0, Math.floor(flowToken));
  } else {
    switch (flowToken) {
      case "hug":
      case "auto":
        basis = intrinsic;
        break;
      case "lock":
        basis = intrinsic;
        lock = true;
        break;
      case "fill":
        basis = 0;
        break;
      default:
        if (flowToken.endsWith("%")) {
          if (Number.isFinite(innerFlowSize)) {
            basis = safeFloor(
              innerFlowSize * parsePercent(flowToken as `${number}%`),
            );
          } else {
            basis = 0;
          }
        } else if (flowToken.endsWith("fr")) {
          basis = 0;
        }
        break;
    }
  }

  const minBound = resolveDimensionBound(
    minToken,
    intrinsic,
    innerFlowSize,
    "min",
  );
  const maxBound = resolveDimensionBound(
    maxToken,
    intrinsic,
    innerFlowSize,
    "max",
  );

  if (minBound !== undefined) {
    basis = Math.max(basis, minBound);
  }
  if (maxBound !== undefined) {
    basis = Math.min(basis, maxBound);
  }

  const grow = item.style.grow !== undefined ? item.style.grow : defaults.grow;
  const shrink =
    item.style.shrink !== undefined ? item.style.shrink : defaults.shrink;

  return {
    size: Math.max(0, Math.floor(basis)),
    min: minBound ?? 0,
    max: maxBound ?? Infinity,
    grow: lock ? 0 : grow,
    shrink: lock ? 0 : shrink,
    lock,
  };
}

function computeCrossMetrics(
  axis: FlowAxis,
  item: StackMeasuredChild,
  innerCrossSize: number,
): CrossMetrics {
  const sizeKey = SIZE_KEYS[axis];
  const crossToken = axis === "x" ? item.style.height : item.style.width;
  const minToken = axis === "x" ? item.style.minHeight : item.style.minWidth;
  const maxToken = axis === "x" ? item.style.maxHeight : item.style.maxWidth;

  const intrinsic = item.intrinsicSize[sizeKey.cross];

  let size = intrinsic;
  let allowStretch = false;
  let lock = false;

  if (typeof crossToken === "number") {
    size = Math.max(0, Math.floor(crossToken));
  } else {
    switch (crossToken) {
      case "hug":
        size = intrinsic;
        break;
      case "auto":
        size = intrinsic;
        allowStretch = true;
        break;
      case "lock":
        size = intrinsic;
        lock = true;
        break;
      case "fill":
        size = intrinsic;
        allowStretch = true;
        break;
      default:
        if (crossToken.endsWith("%")) {
          if (Number.isFinite(innerCrossSize)) {
            size = safeFloor(
              innerCrossSize * parsePercent(crossToken as `${number}%`),
            );
          } else {
            size = intrinsic;
          }
        } else if (crossToken.endsWith("fr")) {
          size = intrinsic;
        }
        break;
    }
  }

  const minBound = resolveDimensionBound(
    minToken,
    intrinsic,
    innerCrossSize,
    "min",
  );
  const maxBound = resolveDimensionBound(
    maxToken,
    intrinsic,
    innerCrossSize,
    "max",
  );

  if (minBound !== undefined) {
    size = Math.max(size, minBound);
  }
  if (maxBound !== undefined) {
    size = Math.min(size, maxBound);
  }

  const align = normalizeAlign(item.style.align);
  if (align === "stretch" && allowStretch && !lock) {
    size = innerCrossSize;
  }

  return {
    size: Math.max(0, Math.floor(size)),
    min: minBound ?? 0,
    max: maxBound ?? Infinity,
    allowStretch,
    lock,
    align,
  };
}

function normalizeAlign(value: CrossAlignment): CrossAlignment {
  if (
    value === "start" ||
    value === "center" ||
    value === "end" ||
    value === "stretch"
  ) {
    return value;
  }
  return "start";
}

function distributeGrow(items: FlowMetrics[], freeSpace: number): number {
  if (freeSpace <= 0) {
    return 0;
  }
  if (!Number.isFinite(freeSpace)) {
    return 0;
  }
  let remaining = Math.floor(freeSpace);
  while (remaining > 0) {
    const growable = items.filter(
      (item) => item.grow > 0 && item.size < item.max,
    );
    if (growable.length === 0) {
      break;
    }
    const totalGrow = growable.reduce((acc, item) => acc + item.grow, 0);
    if (totalGrow <= 0) {
      break;
    }
    let consumed = 0;
    for (const item of growable) {
      const capacity = item.max - item.size;
      if (capacity <= 0) {
        continue;
      }
      const share = Math.floor((remaining * item.grow) / totalGrow);
      if (share <= 0) {
        continue;
      }
      const allocation = Math.min(share, capacity);
      item.size += allocation;
      consumed += allocation;
    }
    remaining -= consumed;
    if (consumed === 0) {
      let progressed = false;
      for (const item of growable) {
        const capacity = item.max - item.size;
        if (capacity <= 0) {
          continue;
        }
        item.size += 1;
        remaining -= 1;
        progressed = true;
        if (remaining <= 0) {
          break;
        }
      }
      if (!progressed) {
        break;
      }
    }
  }
  return freeSpace - Math.max(remaining, 0);
}

function distributeShrink(
  items: FlowMetrics[],
  deficit: number,
): { resolved: number; overflow: number } {
  if (deficit <= 0) {
    return { resolved: 0, overflow: 0 };
  }
  let remaining = Math.floor(deficit);
  const shrinkable = items.filter((item) => item.shrink > 0);
  const totalCapacity = shrinkable.reduce(
    (acc, item) => acc + Math.max(item.size - item.min, 0),
    0,
  );

  if (totalCapacity <= 0) {
    return { resolved: 0, overflow: remaining };
  }
  if (totalCapacity < remaining) {
    for (const item of shrinkable) {
      item.size = Math.max(item.min, item.size - (item.size - item.min));
    }
    return { resolved: totalCapacity, overflow: remaining - totalCapacity };
  }

  while (remaining > 0) {
    const eligible = shrinkable.filter((item) => item.size > item.min);
    if (eligible.length === 0) {
      break;
    }
    const totalShrink = eligible.reduce((acc, item) => acc + item.shrink, 0);
    if (totalShrink <= 0) {
      break;
    }
    let reduced = 0;
    for (const item of eligible) {
      const capacity = item.size - item.min;
      if (capacity <= 0) {
        continue;
      }
      const share = Math.floor((remaining * item.shrink) / totalShrink);
      if (share <= 0) {
        continue;
      }
      const loss = Math.min(share, capacity);
      item.size -= loss;
      reduced += loss;
    }
    remaining -= reduced;
    if (reduced === 0) {
      let progressed = false;
      for (let i = eligible.length - 1; i >= 0 && remaining > 0; i--) {
        const item = eligible[i]!;
        const capacity = item.size - item.min;
        if (capacity <= 0) {
          continue;
        }
        item.size -= 1;
        remaining -= 1;
        progressed = true;
      }
      if (!progressed) {
        break;
      }
    }
  }

  return { resolved: deficit - remaining, overflow: Math.max(remaining, 0) };
}

function computeDistributionOffsets(
  mode: FlowDistribution,
  count: number,
  remaining: number,
  baseGap: number,
): { startOffset: number; gapAugment: number[] } {
  if (count <= 0) {
    return { startOffset: 0, gapAugment: [] };
  }
  const gapAugment = new Array(Math.max(count - 1, 0)).fill(0);
  let startOffset = 0;
  const slack = Math.max(remaining, 0);

  switch (mode) {
    case "start":
      return { startOffset: 0, gapAugment };
    case "end":
      return { startOffset: slack, gapAugment };
    case "center":
      startOffset = Math.floor(slack / 2);
      return { startOffset, gapAugment };
    case "between": {
      if (count <= 1) {
        return { startOffset: 0, gapAugment };
      }
      const segments = count - 1;
      const share = Math.floor(slack / segments);
      let remainder = slack - share * segments;
      for (let i = 0; i < segments; i++) {
        gapAugment[i] = share;
      }
      for (let i = segments - 1; i >= 0 && remainder > 0; i--) {
        gapAugment[i] += 1;
        remainder -= 1;
      }
      return { startOffset: 0, gapAugment };
    }
    case "around": {
      if (count === 1) {
        startOffset = Math.floor(slack / 2);
        return { startOffset, gapAugment };
      }
      const halfSlots = count * 2;
      const base = Math.floor(slack / halfSlots);
      let remainder = slack - base * halfSlots;
      const halves = new Array(halfSlots).fill(base);
      for (let i = halfSlots - 1; i >= 0 && remainder > 0; i--) {
        halves[i] += 1;
        remainder -= 1;
      }
      startOffset = halves[0];
      for (let i = 0; i < count - 1; i++) {
        gapAugment[i] = halves[2 * i + 1] + halves[2 * (i + 1)];
      }
      return { startOffset, gapAugment };
    }
    default:
      return { startOffset: 0, gapAugment };
  }
}

export function alignOffset(
  available: number,
  content: number,
  align: CrossAlignment,
): number {
  if (available <= content) {
    return 0;
  }
  const slack = available - content;
  switch (align) {
    case "center":
      return Math.floor(slack / 2);
    case "end":
      return slack;
    default:
      return 0;
  }
}

function computeCrossOffset(
  align: CrossAlignment,
  innerCross: number,
  size: number,
): number {
  if (align === "stretch") {
    return 0;
  }
  return alignOffset(innerCross, size, align);
}

export function layoutStack(
  origin: Point,
  measurement: StackMeasurement,
): StackLayoutResult {
  const axis = measurement.axis;
  const sizeKey = SIZE_KEYS[axis];
  const pointKey = POINT_KEYS[axis];

  const innerFlowSize = measurement.innerSize[sizeKey.flow];
  const innerCrossSize = measurement.innerSize[sizeKey.cross];
  const baseFlowOrigin =
    origin[pointKey.flow] +
    (axis === "x" ? measurement.padding.left : measurement.padding.top);
  const baseCrossOrigin =
    origin[pointKey.cross] +
    (axis === "x" ? measurement.padding.top : measurement.padding.left);

  const flowMetrics = measurement.items.map((item) =>
    computeFlowMetrics(axis, item, innerFlowSize),
  );
  const crossMetrics = measurement.items.map((item) =>
    computeCrossMetrics(axis, item, innerCrossSize),
  );

  const totalFlowBasis = flowMetrics.reduce((acc, item) => acc + item.size, 0);
  const totalGaps = measurement.gap * Math.max(flowMetrics.length - 1, 0);
  let freeSpace = innerFlowSize - (totalFlowBasis + totalGaps);
  if (!Number.isFinite(freeSpace)) {
    freeSpace = 0;
  }

  let overflow = 0;
  if (freeSpace > 0) {
    const consumed = distributeGrow(flowMetrics, freeSpace);
    freeSpace -= consumed;
  } else if (freeSpace < 0) {
    const { resolved, overflow: extra } = distributeShrink(
      flowMetrics,
      -freeSpace,
    );
    freeSpace += resolved;
    overflow = extra;
  }

  const remaining = Math.max(
    innerFlowSize -
      (flowMetrics.reduce((acc, item) => acc + item.size, 0) + totalGaps),
    0,
  );
  const distribution = computeDistributionOffsets(
    measurement.distribute,
    flowMetrics.length,
    remaining,
    measurement.gap,
  );

  const items: StackLayoutItem[] = [];
  let cursor = baseFlowOrigin + distribution.startOffset;

  for (let i = 0; i < measurement.items.length; i++) {
    const flow = flowMetrics[i]!;
    const cross = crossMetrics[i]!;
    const item = measurement.items[i]!;
    const align = cross.align;

    const crossOffset = computeCrossOffset(align, innerCrossSize, cross.size);

    const size: Size =
      axis === "x"
        ? { width: flow.size, height: cross.size }
        : { width: cross.size, height: flow.size };

    const point: Point =
      axis === "x"
        ? { x: cursor, y: baseCrossOrigin + crossOffset }
        : { x: baseCrossOrigin + crossOffset, y: cursor };

    items.push({ origin: point, size });

    cursor += flow.size;
    if (i < measurement.items.length - 1) {
      cursor += measurement.gap + (distribution.gapAugment[i] ?? 0);
    }
  }

  return {
    items,
    overflow,
    freeSpace: Math.max(freeSpace, 0),
  };
}
