import type { PointerEvent } from "../element/events";
import type { Screen } from "../render/screen";
import type { Mounted, Rect } from "./tree";

import { contains, intersect } from "../layout/geometry";
import { columns, graphemes, sanitize } from "../text/columns";
import { hit } from "./focus";

interface Glyph {
  x: number;
  y: number;
  start: number;
  end: number;
  width: number;
}
/** A text selection belongs to one text element, including its wrapped lines and spans. */
export class TextSelection {
  private node?: Mounted;
  private value = "";
  private glyphs: Glyph[] = [];
  private anchor?: Glyph;
  private end?: Glyph;
  private moved = false;
  press(node: Mounted, event: PointerEvent, screen: Screen): boolean {
    if (node.element.data.kind !== "text") return false;
    this.node = node;
    this.value = sanitize(node.element.data.text ?? "");
    this.glyphs = visibleGlyphs(node, screen);
    this.anchor = this.at(event);
    this.end = this.anchor;
    this.moved = false;
    return this.anchor !== undefined;
  }
  move(event: PointerEvent): void {
    const end = this.at(event);
    if (end && this.anchor) {
      this.end = end;
      this.moved ||= end.start !== this.anchor.start;
    }
  }
  clear(): void {
    this.node = this.anchor = this.end = undefined;
    this.glyphs = [];
    this.moved = false;
  }
  text(): string {
    if (!this.valid() || !this.moved) return "";
    const [from, to] = this.range();
    return this.value.slice(from, to);
  }
  present(screen: Screen, root: Mounted): void {
    const node = this.node;
    if (!node || !this.valid() || !this.moved) return;
    const [from, to] = this.range();
    this.glyphs = visibleGlyphs(node, screen);
    const bounds = { x: 0, y: 0, width: screen.width, height: screen.height };
    const selected = node.element.definition.variants.selected ?? {
      background: "brightWhite",
      foreground: "black",
    };
    for (const glyph of this.glyphs) {
      if (
        glyph.start < from ||
        glyph.end > to ||
        hit(root, glyph, bounds) !== node
      )
        continue;
      for (let x = glyph.x; x < glyph.x + glyph.width; x++) {
        const index = glyph.y * screen.width + x;
        const cell = screen.cells[index];
        if (cell)
          screen.cells[index] = {
            ...cell,
            style: { ...cell.style, ...selected },
          };
      }
    }
  }
  private valid(): boolean {
    return Boolean(
      this.node?.active &&
      sanitize(this.node.element.data.text ?? "") === this.value,
    );
  }
  private range(): [number, number] {
    return [
      Math.min(this.anchor?.start ?? 0, this.end?.start ?? 0),
      Math.max(this.anchor?.end ?? 0, this.end?.end ?? 0),
    ];
  }
  private at(point: { x: number; y: number }): Glyph | undefined {
    if (!this.glyphs.length) return undefined;
    const first = this.glyphs[0];
    if (first && point.y < first.y) return first;
    const row = this.glyphs.filter((glyph) => glyph.y === point.y);
    if (!row.length)
      return this.glyphs.findLast((glyph) => glyph.y < point.y) ?? first;
    return row.find((glyph) => point.x < glyph.x + glyph.width) ?? row.at(-1);
  }
}
function visibleGlyphs(node: Mounted, screen: Screen): Glyph[] {
  const value = sanitize(node.element.data.text ?? "");
  const clip = textClip(node, screen);
  let offset = 0;
  const result: Glyph[] = [];
  for (const [row, original] of node.lines.entries()) {
    const line =
      node.style.overflow === "ellipsis" && original.endsWith("…")
        ? original.slice(0, -1)
        : original;
    const found = value.indexOf(line, offset);
    let start = found < 0 ? offset : found;
    let x = node.inner.x;
    const y = node.inner.y + row;
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
