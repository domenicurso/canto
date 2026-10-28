import type { Mounted } from "./tree";

import { content } from "../layout/measure";
import { textOffset } from "../text/alignment";
import { columns, graphemes, take, width } from "../text/columns";
import { wrap } from "../text/wrap";

export interface EditorLine {
  text: string;
  start: number;
}
export interface EditorView {
  lines: EditorLine[];
  cursor: { x: number; y: number };
  placeholder: boolean;
}
export function editorView(node: Mounted): EditorView {
  const value = content(node);
  const placeholder = !value;
  const display = value || node.element.data.props.input?.placeholder || "";
  const cursor = Math.min(node.cursor, value.length);
  if (node.element.data.kind === "input") return inputView(node, value);
  let offset = 0;
  const lines = wrap(display, node.inner.width, node.style).map((text) => {
    const start = display.indexOf(text, offset);
    offset = Math.max(offset, start) + text.length;
    return { text, start: Math.max(0, start) };
  });
  if (!lines.length) lines.push({ text: "", start: 0 });
  let row = 0;
  lines.forEach((line, index) => {
    if (line.start <= cursor) row = index;
  });
  const top = Math.max(0, row - node.inner.height + 1);
  const line = lines[row];
  return {
    lines: lines.slice(top, top + node.inner.height),
    placeholder,
    cursor: {
      x:
        node.inner.x +
        textOffset(line?.text ?? "", node.inner.width, node.style.textAlign) +
        Math.min(
          node.inner.width - 1,
          width(value.slice(line?.start ?? 0, cursor)),
        ),
      y: node.inner.y + row - top,
    },
  };
}

function inputView(node: Mounted, value: string): EditorView {
  const placeholder = !value;
  const display = value || node.element.data.props.input?.placeholder || "";
  const cursor = Math.min(node.cursor, value.length);
  const shift = Math.max(
    0,
    width(value.slice(0, cursor)) - node.inner.width + 1,
  );
  let start = 0,
    skipped = 0;
  for (const part of graphemes(display)) {
    if (skipped >= shift) break;
    skipped += columns(part);
    start += part.length;
  }
  return {
    lines: [{ text: take(display.slice(start), node.inner.width), start }],
    placeholder,
    cursor: {
      x:
        node.inner.x +
        textOffset(
          take(display.slice(start), node.inner.width),
          node.inner.width,
          node.style.textAlign,
        ) +
        width(value.slice(start, cursor)),
      y: node.inner.y,
    },
  };
}
