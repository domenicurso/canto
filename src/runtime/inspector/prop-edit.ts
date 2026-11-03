import type { Element } from "../../element/node";
import type { ElementProps } from "../../element/props";

/** Rebuild nested props from the latest description so callbacks keep their current closures. */
export function editedProps(
  element: Element,
  key: string,
  source: string,
): ElementProps {
  const value: unknown = JSON.parse(source);
  const base = element.data.props;
  const field = key.split(".")[2];
  const input = base.input;
  if (key.startsWith("props.input.") && input) {
    if (field === "disabled" && typeof value === "boolean")
      return { ...base, input: { ...input, disabled: value } };
    if (field === "readOnly" && typeof value === "boolean")
      return { ...base, input: { ...input, readOnly: value } };
    if (field === "placeholder" && typeof value === "string")
      return { ...base, input: { ...input, placeholder: value } };
    if (
      field === "defaultValue" &&
      typeof value === "string" &&
      input.value === undefined
    )
      return { ...base, input: { ...input, defaultValue: value } };
    if (
      field === "value" &&
      typeof value === "string" &&
      input.value !== undefined
    )
      return { ...base, input: { ...input, value } };
  }
  if (
    key === "props.button.disabled" &&
    typeof value === "boolean" &&
    base.button
  )
    return { ...base, button: { ...base.button, disabled: value } };
  const scroll = base.scroll;
  if (
    key === "props.scroll.gutter" &&
    scroll &&
    (value === "auto" || value === "stable")
  )
    return { ...base, scroll: { ...scroll, gutter: value } };
  if (
    key === "props.scroll.scrollbar" &&
    scroll &&
    (value === "auto" || value === "visible" || value === "hidden")
  )
    return { ...base, scroll: { ...scroll, scrollbar: value } };
  throw new Error("Invalid element property value.");
}
