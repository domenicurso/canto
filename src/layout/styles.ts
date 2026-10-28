import type { Mounted } from "../runtime/tree";
import type { Style } from "../style/types";

import { resolveDefinition } from "../style/definitions";
import { activeInteractions } from "./style-parts";
import { validateStyle } from "./style-validation";

export function resolveStyles(node: Mounted, inherited: Style = {}): void {
  const definition = node.element.definition;
  const style: Style = {
    foreground: inherited.foreground,
    bold: inherited.bold,
    italic: inherited.italic,
    underline: inherited.underline,
    faint: inherited.faint,
    strikethrough: inherited.strikethrough,
    inverse: inherited.inverse,
    underlineColor: inherited.underlineColor,
    textAlign: inherited.textAlign,
    ...definition.base,
  };
  Object.assign(style, resolveDefinition(definition, activeInteractions(node)));
  validateStyle(style);
  for (const name of [
    "translateX",
    "translateY",
    "columnGap",
    "rowGap",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
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
