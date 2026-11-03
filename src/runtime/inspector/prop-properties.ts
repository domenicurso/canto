import type { Mounted } from "../components/tree";
import type { PropertyLine } from "./properties";

import { properties } from "./property-values";

export function propLines(node: Mounted): PropertyLine[] {
  const { data } = node.element;
  const call = data.call;
  const componentProps = call?.props;
  const props = data.props;
  return [
    { label: "Element", section: true },
    ...properties({ kind: data.kind, key: data.key, text: data.text }, (key) =>
      key === "text" ? "text" : undefined,
    ),
    { label: "Component props", section: true },
    ...(componentProps !== null && typeof componentProps === "object"
      ? properties(componentProps, (key) => `component.${key}`)
      : properties({ value: componentProps }, () => "component")),
    { label: "Props", section: true },
    ...properties(props),
    { label: "Input", section: true },
    ...(props.input
      ? properties(props.input, (key) =>
          [
            "value",
            "defaultValue",
            "placeholder",
            "disabled",
            "readOnly",
          ].includes(key)
            ? `props.input.${key}`
            : undefined,
        )
      : []),
    { label: "Button", section: true },
    ...(props.button
      ? properties(props.button, (key) =>
          key === "disabled" ? "props.button.disabled" : undefined,
        )
      : []),
    { label: "Scroll", section: true },
    ...(props.scroll
      ? properties(props.scroll, (key) =>
          ["gutter", "scrollbar"].includes(key)
            ? `props.scroll.${key}`
            : undefined,
        )
      : []),
  ];
}
