import type { Mounted } from "../components/tree";

import { editableStyle } from "./edit-values";
import { layoutLines } from "./layout-properties";
import { propLines } from "./prop-properties";
import { properties, displayValue } from "./property-values";
import { stateLines } from "./state-properties";

export type DetailTab = "Layout" | "Styles" | "Props" | "State";
export interface PropertyLine {
  label: string;
  value?: string;
  source?: string;
  section?: boolean;
  edit?: string;
  box?: boolean;
}
export function propertyLines(node: Mounted, tab: DetailTab): PropertyLine[] {
  const lines =
    tab === "Layout"
      ? layoutLines(node)
      : tab === "Styles"
        ? styleLines(node)
        : tab === "Props"
          ? propLines(node)
          : stateLines(node);
  return lines.filter(
    (line, index) =>
      !line.section || Boolean(lines[index + 1] && !lines[index + 1]?.section),
  );
}
function styleLines(node: Mounted): PropertyLine[] {
  const { definition } = node.element;
  const editable = (key: string) => (editableStyle(key) ? key : undefined);
  return [
    { label: "Resolved", section: true },
    ...properties(node.layout.style, editable),
    { label: "Declared", section: true },
    ...properties(definition.base, editable),
    { label: "Variants", section: true },
    ...properties(definition.variants),
    ...(definition.compounds?.map((compound) => ({
      label: compound.when.join(" + "),
      value: displayValue(compound.style),
    })) ?? []),
    { label: "Parts", section: true },
    ...properties(definition.parts ?? {}),
  ];
}
