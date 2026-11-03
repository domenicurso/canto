import type { Style } from "../../style/types";

import { validateStyle } from "../../layout/styling/validation";
import { rgb } from "../../style/colors";

const numeric = [
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "grow",
  "shrink",
  "gap",
  "columnGap",
  "rowGap",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "top",
  "right",
  "bottom",
  "left",
  "translateX",
  "translateY",
  "zIndex",
  "opacity",
  "maxLines",
] as const;
const booleans = [
  "bold",
  "italic",
  "faint",
  "strikethrough",
  "inverse",
  "selectable",
  "borderTop",
  "borderRight",
  "borderBottom",
  "borderLeft",
  "joinBorders",
] as const;
const colors = [
  "foreground",
  "background",
  "borderColor",
  "underlineColor",
  "borderBackground",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
] as const;
const choices = {
  align: ["start", "center", "end", "stretch"],
  alignSelf: ["start", "center", "end", "stretch"],
  justify: ["start", "center", "end", "between", "around", "evenly"],
  overflow: ["clip", "visible", "ellipsis"],
  wrap: ["word", "character", "none"],
  position: ["static", "absolute"],
  border: ["none", "single", "rounded", "double", "heavy"],
  textAlign: ["left", "center", "right"],
} as const;

export function editableStyle(key: string): boolean {
  return [
    ...numeric,
    ...booleans,
    ...colors,
    "width",
    "height",
    ...Object.keys(choices),
  ].some((name) => name === key);
}

export function parseStyleEdit(key: string, source: string): Style {
  const value: unknown = JSON.parse(source);
  const result =
    key === "padding"
      ? { padding: parsePadding(value) }
      : parseStyleValue(key, value);
  validateStyle(result);
  return result;
}

function parseStyleValue(key: string, value: unknown): Style {
  for (const name of numeric)
    if (key === name && typeof value === "number" && Number.isFinite(value))
      return { [name]: value };
  for (const name of booleans)
    if (key === name && typeof value === "boolean") return { [name]: value };
  for (const name of colors)
    if (
      key === name &&
      (value === null ||
        (typeof value === "string" &&
          /^(#[\da-f]{3}(?:[\da-f]{3})?|[a-z]+)$/i.test(value)))
    ) {
      rgb(value);
      return { [name]: value };
    }
  if (
    (key === "width" || key === "height") &&
    ((typeof value === "number" && Number.isFinite(value) && value >= 0) ||
      value === "fill" ||
      value === "content" ||
      (typeof value === "string" && /^\d+(?:\.\d+)?%$/.test(value)))
  )
    return { [key]: value };
  for (const [name, allowed] of Object.entries(choices))
    if (
      name === key &&
      typeof value === "string" &&
      allowed.some((item) => item === value)
    ) {
      // The allowlist above proves this computed property is a valid Style enum.
      return { [name]: value };
    }
  throw new Error(`Invalid ${key} value.`);
}

function parsePadding(value: unknown): NonNullable<Style["padding"]> {
  if (typeof value === "number") return value;
  if (
    Array.isArray(value) &&
    value.every((item: unknown) => typeof item === "number")
  ) {
    const [top, right, bottom, left]: unknown[] = value;
    if (
      value.length === 2 &&
      typeof top === "number" &&
      typeof right === "number"
    )
      return [top, right];
    if (
      value.length === 4 &&
      typeof top === "number" &&
      typeof right === "number" &&
      typeof bottom === "number" &&
      typeof left === "number"
    )
      return [top, right, bottom, left];
  }
  throw new Error(
    "Padding must be a number or an array of two or four numbers.",
  );
}
