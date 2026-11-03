import type { KeyEvent } from "../../element/events";

import { boundary, vertical } from "../../text/editing/navigation";
import {
  lineRange,
  paragraphBoundary,
  wordBoundary,
} from "../../text/editing/ranges";

export interface EditorState {
  value: string;
  cursor: number;
  anchor: number | null;
  multiline: boolean;
}

export function navigateEditor(
  editor: EditorState,
  value: string,
  event: KeyEvent,
): boolean {
  if (event.ctrl && event.key === "a") {
    editor.anchor = 0;
    editor.cursor = value.length;
    return true;
  }
  const next = destination(editor, value, event);
  if (next === undefined) return false;
  if (event.shift) editor.anchor ??= editor.cursor;
  else editor.anchor = null;
  editor.cursor = next;
  return true;
}
function destination(
  editor: EditorState,
  value: string,
  event: KeyEvent,
): number | undefined {
  const { key, ctrl, alt, meta } = event;
  const cursor = editor.cursor;
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
    if (!event.shift && editor.anchor !== null && editor.anchor !== cursor)
      return direction < 0
        ? Math.min(editor.anchor, cursor)
        : Math.max(editor.anchor, cursor);
    return boundary(value, cursor, direction);
  }
  if ((key === "up" || key === "down") && editor.multiline) {
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
