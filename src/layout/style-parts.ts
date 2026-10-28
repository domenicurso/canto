import type { Mounted } from "../runtime/tree";
import type { Interaction, Style, StylePart } from "../style/types";

import { resolveDefinition } from "../style/definitions";

export function activeInteractions(node: Mounted): Interaction[] {
  const props = node.element.data.props;
  const result: Interaction[] = [];
  if (node.hovered) result.push("hovered");
  if (node.focused) result.push("focused");
  if (node.pressed) result.push("pressed");
  if (props.button?.disabled || props.input?.disabled) result.push("disabled");
  return result;
}
export function partStyle(node: Mounted, part: StylePart): Style {
  const definition = node.element.definition.parts?.[part];
  return definition
    ? resolveDefinition(definition, activeInteractions(node))
    : {};
}
export function selectionStyle(node: Mounted): Style {
  const definition = node.element.definition;
  const compounds = definition.compounds?.filter((entry) =>
    entry.when.includes("selected"),
  );
  const selected = definition.variants.selected;
  if (!selected && !compounds?.length)
    return { background: "brightWhite", foreground: "black" };
  return resolveDefinition({ base: {}, variants: { selected }, compounds }, [
    ...activeInteractions(node),
    "selected",
  ]);
}
