import type { Mounted } from "../runtime/tree";
import type { Style } from "../style/types";

export function resolveStyles(node: Mounted, inherited: Style = {}): void {
  const definition = node.element.definition;
  const style: Style = {
    foreground: inherited.foreground,
    bold: inherited.bold,
    italic: inherited.italic,
    underline: inherited.underline,
    faint: inherited.faint,
    ...definition.base,
  };
  const disabled =
    node.element.data.props.button?.disabled ||
    node.element.data.props.input?.disabled;
  for (const [name, active] of [
    ["hovered", node.hovered],
    ["focused", node.focused],
    ["pressed", node.pressed],
    ["disabled", disabled],
  ] as const) {
    if (active) Object.assign(style, definition.variants[name]);
  }
  validateStyle(style);
  for (const name of [
    "gap",
    "top",
    "right",
    "bottom",
    "left",
    "zIndex",
    "minWidth",
    "maxWidth",
    "minHeight",
    "maxHeight",
  ] as const) {
    const value = style[name];
    if (value !== undefined) style[name] = Math.floor(value);
  }
  node.style = style;
  for (const child of node.children) resolveStyles(child, style);
}
function validateStyle(style: Style): void {
  for (const [name, value] of Object.entries(style)) {
    if (typeof value === "number" && !Number.isFinite(value))
      throw new Error(`Style ${name} must be finite.`);
  }
  for (const name of [
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
