import type { Mounted } from "../components/tree";

import { editableStyle } from "./edit-values";

export type DetailTab = "Layout" | "Styles" | "Props" | "State";
export interface PropertyLine {
  label: string;
  value?: string;
  section?: boolean;
  edit?: string;
  box?: boolean;
}

export function propertyLines(node: Mounted, tab: DetailTab): PropertyLine[] {
  switch (tab) {
    case "Layout":
      return layoutLines(node);
    case "Styles":
      return styleLines(node);
    case "Props":
      return [
        { label: "Element", section: true },
        ...properties({
          kind: node.element.data.kind,
          key: node.element.data.key,
          text: node.element.data.text,
        }).map((line) => ({
          ...line,
          edit: line.label === "text" ? "text" : undefined,
        })),
        { label: "Props", section: true },
        ...properties(node.element.data.props),
      ];
    case "State":
      return stateLines(node);
  }
}

function layoutLines(node: Mounted): PropertyLine[] {
  const { rect, inner, style } = node.layout;
  return [
    { label: "Geometry", section: true },
    ...properties({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      contentWidth: inner.width,
      contentHeight: inner.height,
    }),
    { label: "Box model", box: true },
    { label: "Constraints", section: true },
    ...properties({
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
    }),
    { label: "Content", section: true },
    ...properties(inner),
  ];
}

function styleLines(node: Mounted): PropertyLine[] {
  const { definition } = node.element;
  return [
    { label: "Resolved", section: true },
    ...properties(node.layout.style).map((line) => ({
      ...line,
      edit: editableStyle(line.label) ? line.label : undefined,
    })),
    { label: "Declared", section: true },
    ...properties(definition.base).map((line) => ({
      ...line,
      edit: editableStyle(line.label) ? line.label : undefined,
    })),
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

function stateLines(node: Mounted): PropertyLine[] {
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
    ...component.hooks.map((hook, index) => ({
      label: `${index + 1}. ${hook.kind}`,
      value: displayValue(
        hook.kind === "effect"
          ? { dependencies: hook.dependencies, cleanup: Boolean(hook.cleanup) }
          : hook.value,
      ),
    })),
    { label: "Scroll", section: true },
    ...properties({
      x: scrolling.offsetX,
      y: scrolling.offset,
      maxX: scrolling.maxOffsetX,
      maxY: scrolling.maxOffset,
    }),
    ...(node.element.data.props.input
      ? [
          { label: "Editor", section: true },
          ...properties({
            cursor: editor.cursor,
            anchor: editor.anchor,
            length: editor.value.length,
            multiline: editor.multiline,
          }),
        ]
      : []),
  ];
}

function properties(value: object): PropertyLine[] {
  return inspectableEntries(value)
    .filter(([, item]) => item !== undefined)
    .map(([label, item]: [string, unknown]) => ({
      label,
      value: displayValue(item),
    }));
}

/** Bound depth and collection size so application state cannot flood the inspector. */
export function displayValue(value: unknown, depth = 0): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "function")
    return `[callback${value.name ? ` ${value.name}` : ""}]`;
  if (value === null || typeof value !== "object") return String(value);
  if (value instanceof Uint8Array || value instanceof Uint8ClampedArray)
    return `[${value.byteLength} bytes]`;
  if (depth >= 2)
    return Array.isArray(value) ? `[${value.length} items]` : "{…}";
  if (Array.isArray(value))
    return `[${value
      .slice(0, 6)
      .map((item: unknown) => displayValue(item, depth + 1))
      .join(", ")}${value.length > 6 ? ", …" : ""}]`;
  const entries = inspectableEntries(value);
  return `{${entries
    .slice(0, 6)
    .map(([key, item]) => `${key}: ${displayValue(item, depth + 1)}`)
    .join(", ")}${entries.length > 6 ? ", …" : ""}}`;
}

function inspectableEntries(value: object): [string, unknown][] {
  // Inspecting state must not execute application getters or their side effects.
  return Object.entries(Object.getOwnPropertyDescriptors(value))
    .filter(([, descriptor]) => descriptor.enumerable)
    .map(([key, descriptor]) => [
      key,
      descriptor.get || descriptor.set ? "[accessor]" : descriptor.value,
    ]);
}
