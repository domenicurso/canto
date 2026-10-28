import type { KeyEvent } from "../element/events";
import type { Mounted } from "./tree";

import { content } from "../layout/measure";
import { boundary } from "../text/navigation";
import { navigateEditor } from "./editor-navigation";

export function edit(node: Mounted, event: KeyEvent): boolean {
  const props = node.element.data.props.input;
  if (!props || props.disabled) return false;
  const value = content(node);
  node.cursor = Math.min(node.cursor, value.length);
  if (navigateEditor(node, value, event)) return true;
  if (event.key === "enter" && node.element.data.kind === "input") {
    props.onSubmit?.(value);
    return true;
  }
  if (props.readOnly) return false;
  return change(node, value, event);
}
function change(node: Mounted, value: string, event: KeyEvent): boolean {
  let start = Math.min(node.cursor, node.anchor ?? node.cursor);
  let end = Math.max(node.cursor, node.anchor ?? node.cursor);
  let insert = "";
  if (event.key === "backspace") {
    if (start === end) start = boundary(value, start, -1);
  } else if (event.key === "delete") {
    if (start === end) end = boundary(value, end, 1);
  } else if (event.key === "enter") insert = "\n";
  else if (event.text && !event.ctrl && !event.alt && !event.meta)
    insert = event.text;
  else return false;
  insert = insert
    .replace(/\r\n?/g, "\n")
    .replace(/[\x00-\x08\x0b-\x1f\x7f]/g, "");
  if (node.element.data.kind === "input") insert = insert.replace(/\n/g, " ");
  const next = value.slice(0, start) + insert + value.slice(end);
  node.cursor = start + insert.length;
  node.anchor = null;
  const props = node.element.data.props.input;
  if (props?.value === undefined) node.value = next;
  props?.onChange?.(next);
  return true;
}
