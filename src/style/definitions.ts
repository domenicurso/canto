import type { Interaction, Style, StyleDefinition, StylePart } from "./types";

export const interactions: readonly Interaction[] = [
  "hovered",
  "focused",
  "pressed",
  "disabled",
  "selected",
];
const partNames: readonly StylePart[] = [
  "placeholder",
  "scrollbarThumb",
  "scrollbarTrack",
];
export function mergeDefinitions(
  a: StyleDefinition,
  b: StyleDefinition,
): StyleDefinition {
  const variants = { ...a.variants };
  for (const key of interactions) {
    if (b.variants[key])
      variants[key] = { ...variants[key], ...b.variants[key] };
  }
  const parts = { ...a.parts };
  for (const key of partNames) {
    const value = b.parts?.[key];
    if (value)
      parts[key] = mergeDefinitions(
        parts[key] ?? { base: {}, variants: {} },
        value,
      );
  }
  return {
    base: { ...a.base, ...b.base },
    variants,
    compounds: [...(a.compounds ?? []), ...(b.compounds ?? [])],
    parts,
  };
}
export function nestDefinition(
  name: Interaction,
  value: StyleDefinition,
): StyleDefinition {
  const compounds = [...(value.compounds ?? [])].map((entry) => ({
    ...entry,
    when: [...new Set([name, ...entry.when])],
  }));
  for (const key of interactions) {
    const style = value.variants[key];
    if (style) compounds.push({ when: [...new Set([name, key])], style });
  }
  const parts: StyleDefinition["parts"] = {};
  for (const key of partNames) {
    const part = value.parts?.[key];
    if (part) parts[key] = nestDefinition(name, part);
  }
  return { base: {}, variants: { [name]: value.base }, compounds, parts };
}
export function resolveDefinition(
  definition: StyleDefinition,
  active: readonly Interaction[],
): Style {
  const style = { ...definition.base };
  for (const key of interactions) {
    if (active.includes(key)) Object.assign(style, definition.variants[key]);
  }
  // More specific state combinations override individual states; equal specificity keeps declaration order.
  const compounds = [...(definition.compounds ?? [])].sort(
    (a, b) => a.when.length - b.when.length,
  );
  for (const entry of compounds) {
    if (entry.when.every((key) => active.includes(key)))
      Object.assign(style, entry.style);
  }
  return style;
}
