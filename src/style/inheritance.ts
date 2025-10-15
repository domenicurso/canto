import { isSignal } from "../signals";
import { DEFAULT_STYLE_SNAPSHOT } from "./types";

import type { Signal } from "../signals";
import type {
  BoxPadding,
  CrossAlignment,
  DimensionLimitToken,
  DimensionToken,
  FlowAxis,
  FlowDistribution,
  ResolvedStyle,
  StyleMap,
  StyleSnapshot,
  StyleValue,
  TextWrap,
} from "./types";

function cloneSnapshot(snapshot: StyleSnapshot): StyleSnapshot {
  return {
    foreground: snapshot.foreground,
    background: snapshot.background,
    bold: snapshot.bold,
    italic: snapshot.italic,
    underline: snapshot.underline,
    faint: snapshot.faint,
  };
}

function clonePadding(padding: BoxPadding): BoxPadding {
  return {
    top: padding.top,
    right: padding.right,
    bottom: padding.bottom,
    left: padding.left,
  };
}

function cloneResolvedStyle(style: ResolvedStyle): ResolvedStyle {
  const base = createDefaultStyle();
  const snapshot = cloneSnapshot(style);
  base.foreground = snapshot.foreground;
  base.background = snapshot.background;
  base.bold = snapshot.bold;
  base.italic = snapshot.italic;
  base.underline = snapshot.underline;
  base.faint = snapshot.faint;
  base.padding = clonePadding(style.padding);
  base.textWrap = style.textWrap;
  base.scrollX = style.scrollX;
  base.scrollY = style.scrollY;
  base.scrollbarBackground = style.scrollbarBackground;
  base.scrollbarForeground = style.scrollbarForeground;
  return base;
}

export function createDefaultStyle(): ResolvedStyle {
  return {
    ...cloneSnapshot(DEFAULT_STYLE_SNAPSHOT),
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    width: "auto",
    height: "auto",
    minWidth: "none",
    minHeight: "none",
    maxWidth: "none",
    maxHeight: "none",
    flow: "y",
    gap: 0,
    distribute: "start",
    align: "start",
    grow: undefined,
    shrink: undefined,
    textWrap: "none",
    scrollX: false,
    scrollY: false,
    scrollbarBackground: null,
    scrollbarForeground: null,
  };
}

function unwrap<T>(value: StyleValue<T> | undefined): T | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (isSignal<T>(value)) {
    return (value as Signal<T>).get();
  }
  return value;
}

export function expandPadding(
  value: number | [number, number] | [number, number, number, number],
): BoxPadding {
  if (typeof value === "number" && Number.isFinite(value)) {
    const normalized = Math.max(0, Math.floor(value));
    return {
      top: normalized,
      right: normalized,
      bottom: normalized,
      left: normalized,
    };
  }
  if (Array.isArray(value)) {
    if (value.length === 2) {
      const [vertical, horizontal] = value;
      return {
        top: Math.max(0, Math.floor(vertical)),
        right: Math.max(0, Math.floor(horizontal)),
        bottom: Math.max(0, Math.floor(vertical)),
        left: Math.max(0, Math.floor(horizontal)),
      };
    }
    if (value.length === 4) {
      const [top, right, bottom, left] = value;
      return {
        top: Math.max(0, Math.floor(top)),
        right: Math.max(0, Math.floor(right)),
        bottom: Math.max(0, Math.floor(bottom)),
        left: Math.max(0, Math.floor(left)),
      };
    }
  }
  throw new Error("Invalid padding value");
}

export function resolvePadding(style: ResolvedStyle, map: StyleMap): void {
  if ("padding" in map && map.padding !== undefined) {
    const raw = unwrap(map.padding);
    if (raw !== undefined && raw !== null) {
      style.padding = expandPadding(raw as any);
    }
  }

  const assignEdge = (
    key: "top" | "right" | "bottom" | "left",
    raw: unknown,
  ) => {
    if (typeof raw === "number" && Number.isFinite(raw)) {
      style.padding[key] = Math.max(0, Math.floor(raw));
    }
  };

  if ("paddingTop" in map && map.paddingTop !== undefined) {
    assignEdge("top", unwrap(map.paddingTop));
  }
  if ("paddingRight" in map && map.paddingRight !== undefined) {
    assignEdge("right", unwrap(map.paddingRight));
  }
  if ("paddingBottom" in map && map.paddingBottom !== undefined) {
    assignEdge("bottom", unwrap(map.paddingBottom));
  }
  if ("paddingLeft" in map && map.paddingLeft !== undefined) {
    assignEdge("left", unwrap(map.paddingLeft));
  }
}

function normalizeDimensionToken(
  value: unknown,
  fallback: DimensionToken,
): DimensionToken {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === "string") {
    const token = value.trim();
    if (
      token === "hug" ||
      token === "auto" ||
      token === "lock" ||
      token === "fill"
    ) {
      return token;
    }
    if (/^-?\d+(\.\d+)?%$/.test(token)) {
      return token as `${number}%`;
    }
    if (/^-?\d+(\.\d+)?fr$/.test(token)) {
      return token as `${number}fr`;
    }
    const numeric = Number(token);
    if (Number.isFinite(numeric)) {
      return Math.max(0, Math.floor(numeric));
    }
  }
  return fallback;
}

function normalizeLimitToken(
  value: unknown,
  fallback: DimensionLimitToken,
): DimensionLimitToken {
  if (value === "none") {
    return "none";
  }
  if (fallback === "none") {
    const normalized = normalizeDimensionToken(value, "auto");
    if (normalized === "auto" && value !== "auto") {
      return "none";
    }
    return normalized;
  }
  return normalizeDimensionToken(value, fallback);
}

function sanitizeFlow(value: unknown, fallback: FlowAxis): FlowAxis {
  if (value === "x" || value === "y") {
    return value;
  }
  return fallback;
}

function sanitizeDistribution(
  value: unknown,
  fallback: FlowDistribution,
): FlowDistribution {
  if (
    value === "start" ||
    value === "center" ||
    value === "end" ||
    value === "between" ||
    value === "around"
  ) {
    return value;
  }
  return fallback;
}

function sanitizeAlignment(
  value: unknown,
  fallback: CrossAlignment,
): CrossAlignment {
  if (
    value === "start" ||
    value === "center" ||
    value === "end" ||
    value === "stretch"
  ) {
    return value;
  }
  return fallback;
}

function sanitizeWrap(value: unknown, fallback: TextWrap): TextWrap {
  if (value === "none" || value === "word" || value === "char") {
    return value;
  }
  return fallback;
}

function sanitizeNonNegative(value: unknown): number | undefined {
  if (typeof value !== "number") {
    return undefined;
  }
  if (!Number.isFinite(value)) {
    return undefined;
  }
  return value < 0 ? 0 : value;
}

export function resolveStyle(
  inherited: ResolvedStyle | undefined,
  map?: StyleMap,
): ResolvedStyle {
  const base = inherited ? cloneResolvedStyle(inherited) : createDefaultStyle();
  if (!map) {
    return base;
  }

  resolvePadding(base, map);

  if ("foreground" in map) {
    const value = unwrap(map.foreground);
    base.foreground = value ?? null;
  }
  if ("background" in map) {
    const value = unwrap(map.background);
    base.background = value ?? null;
  }
  if ("bold" in map) {
    base.bold = Boolean(unwrap(map.bold));
  }
  if ("italic" in map) {
    base.italic = Boolean(unwrap(map.italic));
  }
  if ("underline" in map) {
    base.underline = Boolean(unwrap(map.underline));
  }
  if ("faint" in map) {
    base.faint = Boolean(unwrap(map.faint));
  }

  if ("width" in map) {
    const value = unwrap(map.width);
    if (value !== undefined) {
      base.width = normalizeDimensionToken(value, base.width);
    }
  }
  if ("height" in map) {
    const value = unwrap(map.height);
    if (value !== undefined) {
      base.height = normalizeDimensionToken(value, base.height);
    }
  }
  if ("minWidth" in map) {
    const value = unwrap(map.minWidth);
    if (value !== undefined) {
      base.minWidth = normalizeLimitToken(value, base.minWidth);
    }
  }
  if ("minHeight" in map) {
    const value = unwrap(map.minHeight);
    if (value !== undefined) {
      base.minHeight = normalizeLimitToken(value, base.minHeight);
    }
  }
  if ("maxWidth" in map) {
    const value = unwrap(map.maxWidth);
    if (value !== undefined) {
      base.maxWidth = normalizeLimitToken(value, base.maxWidth);
    }
  }
  if ("maxHeight" in map) {
    const value = unwrap(map.maxHeight);
    if (value !== undefined) {
      base.maxHeight = normalizeLimitToken(value, base.maxHeight);
    }
  }
  if ("flow" in map) {
    base.flow = sanitizeFlow(unwrap(map.flow), base.flow);
  }
  if ("gap" in map) {
    const gap = unwrap(map.gap);
    if (typeof gap === "number" && Number.isFinite(gap)) {
      base.gap = Math.max(0, Math.floor(gap));
    }
  }
  if ("distribute" in map) {
    base.distribute = sanitizeDistribution(
      unwrap(map.distribute),
      base.distribute,
    );
  }
  if ("align" in map) {
    base.align = sanitizeAlignment(unwrap(map.align), base.align);
  }
  if ("grow" in map) {
    const raw = unwrap(map.grow);
    if (raw === null) {
      base.grow = undefined;
    } else {
      const normalized = sanitizeNonNegative(raw);
      if (normalized !== undefined) {
        base.grow = normalized;
      }
    }
  }
  if ("shrink" in map) {
    const raw = unwrap(map.shrink);
    if (raw === null) {
      base.shrink = undefined;
    } else {
      const normalized = sanitizeNonNegative(raw);
      if (normalized !== undefined) {
        base.shrink = normalized;
      }
    }
  }
  if ("textWrap" in map) {
    base.textWrap = sanitizeWrap(unwrap(map.textWrap), base.textWrap);
  }
  if ("scrollX" in map) {
    const value = unwrap(map.scrollX);
    if (value !== undefined) {
      base.scrollX = Boolean(value);
    }
  }
  if ("scrollY" in map) {
    const value = unwrap(map.scrollY);
    if (value !== undefined) {
      base.scrollY = Boolean(value);
    }
  }
  if ("scrollbarBackground" in map) {
    const value = unwrap(map.scrollbarBackground);
    base.scrollbarBackground = value ?? null;
  }
  if ("scrollbarForeground" in map) {
    const value = unwrap(map.scrollbarForeground);
    base.scrollbarForeground = value ?? null;
  }

  return base;
}
