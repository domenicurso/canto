import type { Style } from "../style/types";

import { sanitize, graphemes, width } from "../text/columns";

export function validateStyle(style: Style): void {
  for (const [name, value] of Object.entries(style)) {
    if (typeof value === "number" && !Number.isFinite(value))
      throw new Error(`Style ${name} must be finite.`);
  }
  for (const name of [
    "columnGap",
    "rowGap",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "gap",
    "grow",
    "shrink",
    "minWidth",
    "minHeight",
    "maxWidth",
    "maxHeight",
  ] as const) {
    if ((style[name] ?? 0) < 0)
      throw new Error(`Style ${name} cannot be negative.`);
  }
  if (typeof style.border === "object") {
    for (const glyph of Object.values(style.border)) {
      if (
        sanitize(glyph) !== glyph ||
        graphemes(glyph).length !== 1 ||
        width(glyph) !== 1
      )
        throw new Error(
          "Custom border glyphs must each occupy one terminal cell.",
        );
    }
  }
  if (style.opacity !== undefined && (style.opacity < 0 || style.opacity > 1))
    throw new Error("Opacity must be between zero and one.");
  const p = style.padding;
  if (
    p !== undefined &&
    (typeof p === "number"
      ? p < 0 || !Number.isFinite(p)
      : p.some((n) => n < 0 || !Number.isFinite(n)))
  ) {
    throw new Error("Padding must contain finite, nonnegative cell sizes.");
  }
}
