import { isSignal } from "../signals";
import { DEFAULT_STYLE_SNAPSHOT } from "./types";

import type { Signal } from "../signals";
import type {
  BoxPadding,
  Dimension,
  ResolvedStyle,
  StyleMap,
  StyleSnapshot,
  StyleValue,
} from "./types";

function cloneSnapshot(snapshot: StyleSnapshot): StyleSnapshot {
  return {
    foreground: snapshot.foreground,
    background: snapshot.background,
    bold: snapshot.bold,
    italic: snapshot.italic,
    underline: snapshot.underline,
  };
}

export function createDefaultStyle(): ResolvedStyle {
  return {
    ...cloneSnapshot(DEFAULT_STYLE_SNAPSHOT),
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    width: undefined,
    height: undefined,
    minWidth: 0,
    minHeight: 0,
    maxWidth: undefined,
    maxHeight: undefined,
    xAlign: "left",
    yAlign: "top",
    gap: 0,
    textWrap: "none",
    scrollX: false,
    scrollY: false,
    scrollbarBackground: null,
    scrollbarForeground: null,
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
  return {
    ...createDefaultStyle(),
    ...cloneSnapshot(style),
    textWrap: style.textWrap,
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
  if (typeof value === "number") {
    return { top: value, right: value, bottom: value, left: value };
  }
  if (Array.isArray(value)) {
    if (value.length === 2) {
      const [vertical, horizontal] = value;
      return {
        top: vertical,
        right: horizontal,
        bottom: vertical,
        left: horizontal,
      };
    }
    if (value.length === 4) {
      const [top, right, bottom, left] = value;
      return { top, right, bottom, left };
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

  if ("paddingTop" in map && map.paddingTop !== undefined) {
    const value = unwrap(map.paddingTop);
    if (typeof value === "number") {
      style.padding.top = value;
    }
  }
  if ("paddingRight" in map && map.paddingRight !== undefined) {
    const value = unwrap(map.paddingRight);
    if (typeof value === "number") {
      style.padding.right = value;
    }
  }
  if ("paddingBottom" in map && map.paddingBottom !== undefined) {
    const value = unwrap(map.paddingBottom);
    if (typeof value === "number") {
      style.padding.bottom = value;
    }
  }
  if ("paddingLeft" in map && map.paddingLeft !== undefined) {
    const value = unwrap(map.paddingLeft);
    if (typeof value === "number") {
      style.padding.left = value;
    }
  }
}

function resolveDimension(
  style: ResolvedStyle,
  key: keyof Pick<
    ResolvedStyle,
    "width" | "height" | "minWidth" | "maxWidth" | "minHeight" | "maxHeight"
  >,
  map: StyleMap,
): void {
  if (key in map) {
    const raw = unwrap(
      map[key as keyof StyleMap] as StyleValue<Dimension> | undefined,
    );
    if (raw !== undefined) {
      (style as any)[key] = raw;
    }
  }
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
    const value = unwrap(map.bold);
    base.bold = Boolean(value);
  }
  if ("italic" in map) {
    const value = unwrap(map.italic);
    base.italic = Boolean(value);
  }
  if ("underline" in map) {
    const value = unwrap(map.underline);
    base.underline = Boolean(value);
  }

  resolveDimension(base, "width", map);
  resolveDimension(base, "height", map);
  resolveDimension(base, "minWidth", map);
  resolveDimension(base, "maxWidth", map);
  resolveDimension(base, "minHeight", map);
  resolveDimension(base, "maxHeight", map);

  if ("xAlign" in map) {
    const value = unwrap(map.xAlign);
    if (value) {
      base.xAlign = value;
    }
  }
  if ("yAlign" in map) {
    const value = unwrap(map.yAlign);
    if (value) {
      base.yAlign = value;
    }
  }
  if ("gap" in map) {
    const value = unwrap(map.gap);
    if (typeof value === "number") {
      base.gap = value;
    }
  }
  if ("textWrap" in map) {
    const value = unwrap(map.textWrap);
    if (value) {
      base.textWrap = value;
    }
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
