import { content } from "../layout/measure";
import { boundary, vertical } from "../text/navigation";

import type { KeyEvent } from "../element/events";
import type { Mounted } from "./tree";

export function edit(node: Mounted, event: KeyEvent): boolean {
  const props = node.element.data.props.input;
  if (!props || props.disabled) return false;
  const value = content(node);
  node.cursor = Math.min(node.cursor, value.length);
  if (navigate(node, value, event)) return true;
  if (event.key === "enter" && node.element.data.kind === "input") {
    props.onSubmit?.(value);
    return true;
  }
  if (props.readOnly) return false;
  return change(node, value, event);
}
function navigate(node: Mounted, value: string, event: KeyEvent): boolean {
  const key = event.key;
  let next: number;
  if (key === "left" || key === "right")
    next = boundary(value, node.cursor, key === "left" ? -1 : 1);
  else if ((key === "up" || key === "down") && node.element.data.kind === "textarea")
    next = vertical(value, node.cursor, key === "up" ? -1 : 1);
  else if (key === "home") next = value.lastIndexOf("\n", node.cursor - 1) + 1;
  else if (key === "end") {
    const end = value.indexOf("\n", node.cursor);
    next = end < 0 ? value.length : end;
  } else if (event.ctrl && key === "a") {
    node.anchor = 0;
    node.cursor = value.length;
    return true;
  } else if (event.ctrl && key === "e") next = value.length;
  else return false;
  if (event.shift) node.anchor ??= node.cursor;
  else node.anchor = null;
  node.cursor = next;
  return true;
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
  else if (event.text && !event.ctrl && !event.alt) insert = event.text;
  else return false;
  insert = insert.replace(/\r\n?/g, "\n").replace(/[\x00-\x08\x0b-\x1f\x7f]/g, "");
  if (node.element.data.kind === "input") insert = insert.replace(/\n/g, " ");
  const next = value.slice(0, start) + insert + value.slice(end);
  node.cursor = start + insert.length;
  node.anchor = null;
  const props = node.element.data.props.input;
  if (props?.value === undefined) node.value = next;
  props?.onChange?.(next);
  return true;
}
