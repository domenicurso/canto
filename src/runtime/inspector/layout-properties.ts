import type { Mounted } from "../components/tree";
import type { PropertyLine } from "./properties";

import { properties } from "./property-values";

export function layoutLines(node: Mounted): PropertyLine[] {
  const { rect, style } = node.layout;
  return [
    { label: "Geometry", section: true },
    ...properties(
      {
        x: rect.x,
        y: rect.y,
      },
      (key) => `layout.${key}`,
    ),
    { label: "Box model", box: true },
    { label: "Constraints", section: true },
    ...properties(
      {
        width: style.width ?? "content",
        height: style.height ?? "content",
        minWidth: style.minWidth,
        maxWidth: style.maxWidth,
        minHeight: style.minHeight,
        maxHeight: style.maxHeight,
        grow: style.grow,
        shrink: style.shrink,
        align: style.align ?? "start",
        justify: style.justify ?? "start",
        overflow: style.overflow ?? "clip",
        position: style.position ?? "static",
        padding: style.padding ?? 0,
        gap: style.gap ?? 0,
        border: style.border ?? "none",
      },
      (key) => key,
    ),
  ];
}
