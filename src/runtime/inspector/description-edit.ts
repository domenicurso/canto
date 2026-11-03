import type { Mounted } from "../components/tree";

import { Element } from "../../element/node";
import { parseStyleEdit } from "./edit-values";
import { parseCompatibleJSON } from "./json-values";
import { editedProps } from "./prop-edit";

export type DescriptionPatch = (element: Element) => Element;
export function descriptionEdit(
  node: Mounted,
  key: string,
  source: string,
): DescriptionPatch {
  if (key === "text") {
    const value: unknown = JSON.parse(source);
    if (typeof value !== "string")
      throw new Error("Text must be a JSON string.");
    return (element) =>
      new Element(
        { ...element.data, text: value, runs: undefined },
        element.definition,
      );
  }
  if (key.startsWith("box.border")) return borderEdit(key, source);
  if (key.startsWith("component")) return componentEdit(node, key, source);
  if (key.startsWith("props.")) {
    editedProps(node.element, key, source);
    return (element) =>
      new Element(
        { ...element.data, props: editedProps(element, key, source) },
        element.definition,
      );
  }
  const style = parseStyleEdit(...layoutSource(node, key, source));
  return (element) =>
    new Element(element.data, {
      ...element.definition,
      base: { ...element.definition.base, ...style },
    });
}
function layoutSource(
  node: Mounted,
  key: string,
  source: string,
): [string, string] {
  if (!key.startsWith("layout.") && !key.startsWith("content."))
    return [key, source];
  const value: unknown = JSON.parse(source);
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error("Geometry requires a finite number of cells.");
  const name = key.split(".")[1];
  const { rect, inner, style } = node.layout;
  const content = key.startsWith("content.");
  if (name === "x" || name === "y") {
    const translation = name === "x" ? "translateX" : "translateY";
    return [
      translation,
      String(
        value -
          (content ? inner[name] : rect[name]) +
          (style[translation] ?? 0),
      ),
    ];
  }
  const width = name === "width" || name === "contentWidth";
  const inset = width ? rect.width - inner.width : rect.height - inner.height;
  return [
    width ? "width" : "height",
    String(value + (content || name?.startsWith("content") ? inset : 0)),
  ];
}
function componentEdit(
  node: Mounted,
  key: string,
  source: string,
): DescriptionPatch {
  const call = node.element.data.call;
  if (!call?.renderWithProps)
    throw new Error("Select a component to edit its props.");
  const name = key.slice("component.".length);
  const current =
    key === "component"
      ? call.props
      : Object.getOwnPropertyDescriptor(call.props, name)?.value;
  const value = parseCompatibleJSON(source, current);
  return (element) => {
    const original = element.data.call;
    if (!original?.renderWithProps) return element;
    const render = original.renderWithProps;
    let props = value;
    if (key !== "component") {
      const base = original.props;
      if (!base || typeof base !== "object")
        throw new Error("Select an object prop.");
      props = { ...base, [name]: value };
    }
    return new Element(
      {
        ...element.data,
        call: {
          ...original,
          props,
          render: () => render(props),
        },
      },
      element.definition,
    );
  };
}

function borderEdit(key: string, source: string): DescriptionPatch {
  const value: unknown = JSON.parse(source);
  if (value !== 0 && value !== 1)
    throw new Error("Terminal borders are zero or one cell wide.");
  const field = key.slice(4);
  if (
    !["borderTop", "borderRight", "borderBottom", "borderLeft"].includes(field)
  )
    throw new Error("Unknown border side.");
  return (element) => {
    const base = element.definition.base;
    const enabled = value === 1 && (!base.border || base.border === "none");
    const style = {
      ...base,
      ...(enabled
        ? {
            border: "single" as const,
            borderTop: false,
            borderRight: false,
            borderBottom: false,
            borderLeft: false,
          }
        : {}),
      [field]: value === 1,
    };
    return new Element(element.data, { ...element.definition, base: style });
  };
}
