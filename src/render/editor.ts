import type { Mounted, Rect } from "../runtime/tree";
import type { Screen } from "./screen";

import { partStyle, selectionStyle } from "../layout/style-parts";
import { editorView } from "../runtime/editor-view";
import { textOffset } from "../text/alignment";
import { columns, graphemes } from "../text/columns";

export function drawEditor(node: Mounted, screen: Screen, clip: Rect): void {
  const view = editorView(node);
  const from = Math.min(node.anchor ?? node.cursor, node.cursor);
  const to = Math.max(node.anchor ?? node.cursor, node.cursor);
  const selected = selectionStyle(node);
  const placeholder = partStyle(node, "placeholder");
  for (const [row, line] of view.lines.entries()) {
    let x =
      node.inner.x +
      textOffset(line.text, node.inner.width, node.style.textAlign);
    let index = line.start;
    for (const part of graphemes(line.text)) {
      const style = {
        ...node.style,
        faint: node.style.faint || view.placeholder,
        ...(view.placeholder ? placeholder : {}),
        ...(!view.placeholder && index >= from && index < to ? selected : {}),
      };
      screen.put(
        { x, y: node.inner.y + row, width: node.inner.width, height: 1 },
        part,
        style,
        clip,
      );
      x += columns(part);
      index += part.length;
    }
  }
}
