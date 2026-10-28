import type { Screen } from "../render/screen";
import type { Mounted, Rect } from "./tree";

import { contains, intersect } from "../layout/geometry";
import { textOffset } from "../text/alignment";
import { columns, graphemes, sanitize } from "../text/columns";
export interface Glyph {
  x: number;
  y: number;
  start: number;
  end: number;
  width: number;
}
export function visibleGlyphs(node: Mounted, screen: Screen): Glyph[] {
  const value = sanitize(node.element.data.text ?? "");
  const clip = textClip(node, screen);
  if (!clip.width || !clip.height) return [];
  let offset = 0;
  const result: Glyph[] = [];
  for (const [row, original] of node.lines.entries()) {
    const line =
      node.style.overflow === "ellipsis" && original.endsWith("…")
        ? original.slice(0, -1)
        : original;
    const found = value.indexOf(line, offset);
    let start = found < 0 ? offset : found;
    let x =
      node.inner.x +
      textOffset(original, node.inner.width, node.style.textAlign);
    const y = node.inner.y + row;
    if (y < clip.y || y >= clip.y + clip.height) {
      offset = start + line.length;
      continue;
    }
    for (const text of graphemes(line)) {
      const width = columns(text);
      const end = start + text.length;
      if (width && contains(clip, x, y) && contains(clip, x + width - 1, y))
        result.push({ x, y, start, end, width });
      x += width;
      start = end;
    }
    offset = start;
  }
  return result;
}
function textClip(node: Mounted, screen: Screen): Rect {
  let clip = intersect(node.inner, {
    x: 0,
    y: 0,
    width: screen.width,
    height: screen.height,
  });
  for (let parent = node.parent; parent; parent = parent.parent)
    if (
      parent.style.overflow !== "visible" ||
      parent.element.data.kind === "scroll"
    )
      clip = intersect(clip, parent.inner);
  return clip;
}
