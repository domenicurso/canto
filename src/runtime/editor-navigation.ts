import type { KeyEvent } from "../element/events";
import type { Mounted } from "./tree";

import { boundary, vertical } from "../text/navigation";
import { lineRange, paragraphBoundary, wordBoundary } from "../text/ranges";

export function navigateEditor(
  node: Mounted,
  value: string,
  event: KeyEvent,
): boolean {
  if (event.ctrl && event.key === "a") {
    node.anchor = 0;
    node.cursor = value.length;
    return true;
  }
  const next = destination(node, value, event);
  if (next === undefined) return false;
  if (event.shift) node.anchor ??= node.cursor;
  else node.anchor = null;
  node.cursor = next;
  return true;
}
function destination(
  node: Mounted,
  value: string,
  event: KeyEvent,
): number | undefined {
  const { key, ctrl, alt, meta } = event;
  const cursor = node.cursor;
  const [start, end] = lineRange(value, cursor);
  if (key === "home" || key === "end")
    return ctrl || meta
      ? key === "home"
        ? 0
        : value.length
      : key === "home"
        ? start
        : lineEnd(value, end);
  if (ctrl && key === "e") return value.length;
  const horizontal =
    key === "left" || key === "right" || (alt && (key === "b" || key === "f"));
  const direction = key === "left" || key === "up" || key === "b" ? -1 : 1;
  if (horizontal) {
    if (meta) return direction < 0 ? start : lineEnd(value, end);
    if (ctrl || alt) return wordBoundary(value, cursor, direction);
    if (!event.shift && node.anchor !== null && node.anchor !== cursor)
      return direction < 0
        ? Math.min(node.anchor, cursor)
        : Math.max(node.anchor, cursor);
    return boundary(value, cursor, direction);
  }
  if (
    (key === "up" || key === "down") &&
    node.element.data.kind === "textarea"
  ) {
    if (meta) return direction < 0 ? 0 : value.length;
    return ctrl || alt
      ? paragraphBoundary(value, cursor, direction)
      : vertical(value, cursor, direction);
  }
  return undefined;
}
function lineEnd(value: string, end: number): number {
  return end > 0 && value[end - 1] === "\n" ? end - 1 : end;
}
