import type { Mounted, Rect } from "../runtime/tree";
import type { Screen } from "./screen";

import { editorView } from "../runtime/editor-view";
import { columns, graphemes } from "../text/columns";

export function drawEditor(node: Mounted, screen: Screen, clip: Rect): void {
  const view = editorView(node);
  const from = Math.min(node.anchor ?? node.cursor, node.cursor);
  const to = Math.max(node.anchor ?? node.cursor, node.cursor);
  const selected = node.element.definition.variants.selected ?? {
    background: "brightWhite",
    foreground: "black",
  };
  for (const [row, line] of view.lines.entries()) {
    let x = node.inner.x;
    let index = line.start;
    for (const part of graphemes(line.text)) {
      const style = {
        ...node.style,
        faint: node.style.faint || view.placeholder,
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
