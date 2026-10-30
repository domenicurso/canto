import type { Rect } from "../layout/geometry";
import type { Mounted } from "../runtime/tree";
import type { Screen } from "./screen";

import { partStyle, selectionStyle } from "../layout/style-parts";
import { editorView } from "../runtime/editor-view";
import { textOffset } from "../text/alignment";
import { columns, graphemes } from "../text/columns";

export function drawEditor(node: Mounted, screen: Screen, clip: Rect): void {
  const view = editorView(node);
  const from = Math.min(
    node.editor.anchor ?? node.editor.cursor,
    node.editor.cursor,
  );
  const to = Math.max(
    node.editor.anchor ?? node.editor.cursor,
    node.editor.cursor,
  );
  const selected = selectionStyle(node);
  const placeholder = partStyle(node, "placeholder");
  for (const [row, line] of view.lines.entries()) {
    let x =
      node.layout.inner.x +
      textOffset(
        line.text,
        node.layout.inner.width,
        node.layout.style.textAlign,
      );
    let index = line.start;
    for (const part of graphemes(line.text)) {
      const style = {
        ...node.layout.style,
        faint: node.layout.style.faint || view.placeholder,
        ...(view.placeholder ? placeholder : {}),
        ...(!view.placeholder && index >= from && index < to ? selected : {}),
      };
      screen.put(
        {
          x,
          y: node.layout.inner.y + row,
          width: node.layout.inner.width,
          height: 1,
        },
        part,
        style,
        clip,
      );
      x += columns(part);
      index += part.length;
    }
  }
}
