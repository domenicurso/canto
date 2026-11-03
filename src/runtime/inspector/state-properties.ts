import type { Mounted } from "../components/tree";
import type { PropertyLine } from "./properties";

import { jsonEditSource } from "./json-values";
import { properties, displayValue } from "./property-values";

export function stateLines(node: Mounted): PropertyLine[] {
  const { component, interaction, scrolling, editor } = node;
  return [
    { label: "Interaction", section: true },
    ...properties({
      ...interaction,
      active: node.active,
      rendered: component.rendered,
      dirty: component.dirty,
      children: node.children.length,
    }),
    { label: "Hooks", section: true },
    ...hookLines(node),
    { label: "Scroll", section: true },
    ...(node.element.data.props.scroll
      ? properties(
          {
            x: scrolling.offsetX,
            y: scrolling.offset,
            maxX: scrolling.maxOffsetX,
            maxY: scrolling.maxOffset,
          },
          (key) =>
            key === "x" || key === "y" ? `state.scroll.${key}` : undefined,
        )
      : []),
    { label: "Editor", section: true },
    ...(node.element.data.props.input
      ? properties(
          {
            value: editor.value,
            cursor: editor.cursor,
            anchor: editor.anchor,
            length: editor.value.length,
            multiline: editor.multiline,
          },
          (key) =>
            ["value", "cursor", "anchor"].includes(key)
              ? `state.editor.${key}`
              : undefined,
        )
      : []),
  ];
}

function hookLines(node: Mounted): PropertyLine[] {
  return node.component.hooks.map((hook, index) => ({
    label: `${index + 1}. ${hook.kind}`,
    value: displayValue(
      hook.kind === "effect"
        ? { dependencies: hook.dependencies, cleanup: Boolean(hook.cleanup) }
        : hook.value,
    ),
    edit:
      hook.kind === "state" && jsonEditSource(hook.value) !== undefined
        ? `state.hook.${index}`
        : undefined,
    source: hook.kind === "state" ? jsonEditSource(hook.value) : undefined,
  }));
}
