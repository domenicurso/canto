import type { PointerEvent } from "../element/events";
import type { Screen } from "../render/screen";
import type { SelectionUnit } from "../text/ranges";
import type { Glyph } from "./selection-glyphs";
import type { Mounted } from "./tree";

import { selectionStyle } from "../layout/style-parts";
import { sanitize } from "../text/columns";
import { selectionRange } from "../text/ranges";
import { hit } from "./focus";
import { visibleGlyphs } from "./selection-glyphs";
import { walk } from "./tree";

interface Source {
  node: Mounted;
  value: string;
  start: number;
}
interface LocatedGlyph extends Glyph {
  node: Mounted;
}
export class TextSelection {
  private sources: Source[] = [];
  private value = "";
  private glyphs: LocatedGlyph[] = [];
  private anchor: [number, number] = [0, 0];
  private end: [number, number] = [0, 0];
  private moved = false;
  private unit: SelectionUnit = "character";
  press(
    node: Mounted,
    event: PointerEvent,
    screen: Screen,
    clicks: number,
  ): boolean {
    if (!selectable(node)) return false;
    let root = node;
    while (root.parent) root = root.parent;
    this.capture(root, screen);
    this.unit = clicks === 3 ? "line" : clicks === 2 ? "word" : "character";
    const glyph = this.at(event);
    if (!glyph) return false;
    this.anchor = this.end = this.expand(glyph);
    this.moved = clicks > 1;
    return true;
  }
  move(event: PointerEvent): void {
    const glyph = this.at(event);
    if (!glyph) return;
    this.end = this.expand(glyph);
    this.moved ||= this.end[0] !== this.anchor[0];
  }
  clear(): void {
    this.sources = [];
    this.glyphs = [];
    this.moved = false;
  }
  text(): string {
    if (!this.valid() || !this.moved) return "";
    return this.value.slice(...this.range());
  }
  present(screen: Screen, root: Mounted): void {
    if (!this.valid() || !this.moved) return;
    this.refresh(screen);
    const [from, to] = this.range();
    const bounds = { x: 0, y: 0, width: screen.width, height: screen.height };
    for (const glyph of this.glyphs) {
      if (
        glyph.start < from ||
        glyph.end > to ||
        hit(root, glyph, bounds) !== glyph.node
      )
        continue;
      const selected = selectionStyle(glyph.node);
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
  private capture(root: Mounted, screen: Screen): void {
    this.sources = [];
    this.value = "";
    const nodes = walk(root)
      .filter(selectable)
      .filter((node) => visibleGlyphs(node, screen).length);
    nodes.sort((a, b) => a.inner.y - b.inner.y || a.inner.x - b.inner.x);
    for (const node of nodes) {
      const previous = this.sources.at(-1)?.node;
      if (previous)
        this.value += previous.inner.y === node.inner.y ? " " : "\n";
      const value = sanitize(node.element.data.text ?? "");
      this.sources.push({ node, value, start: this.value.length });
      this.value += value;
    }
    this.refresh(screen);
  }
  private refresh(screen: Screen): void {
    this.glyphs = this.sources.flatMap((source) =>
      visibleGlyphs(source.node, screen).map((glyph) => ({
        ...glyph,
        node: source.node,
        start: glyph.start + source.start,
        end: glyph.end + source.start,
      })),
    );
    this.glyphs.sort((a, b) => a.y - b.y || a.x - b.x);
  }
  private valid(): boolean {
    return (
      this.sources.length > 0 &&
      this.sources.every(
        (source) =>
          source.node.active &&
          selectable(source.node) &&
          sanitize(source.node.element.data.text ?? "") === source.value,
      )
    );
  }
  private range(): [number, number] {
    return [
      Math.min(this.anchor[0], this.end[0]),
      Math.max(this.anchor[1], this.end[1]),
    ];
  }
  private expand(glyph: LocatedGlyph): [number, number] {
    if (this.unit === "character") return [glyph.start, glyph.end];
    if (this.unit === "word") {
      const source = this.sources.find((source) => source.node === glyph.node);
      if (!source) return [glyph.start, glyph.end];
      const [start, end] = selectionRange(
        source.value,
        glyph.start - source.start,
        "word",
      );
      return [start + source.start, end + source.start];
    }
    const row = this.glyphs.filter((other) => other.y === glyph.y);
    return [
      Math.min(...row.map((other) => other.start)),
      Math.max(...row.map((other) => other.end)),
    ];
  }
  private at(point: { x: number; y: number }): LocatedGlyph | undefined {
    const first = this.glyphs[0];
    if (first && point.y < first.y) return first;
    const row = this.glyphs.filter((glyph) => glyph.y === point.y);
    if (!row.length)
      return this.glyphs.findLast((glyph) => glyph.y < point.y) ?? first;
    return row.find((glyph) => point.x < glyph.x + glyph.width) ?? row.at(-1);
  }
}
function selectable(node: Mounted): boolean {
  if (node.element.data.kind !== "text") return false;
  let enabled: boolean | undefined;
  for (let owner: Mounted | null = node; owner; owner = owner.parent) {
    if (owner.element.data.props.input || owner.element.data.props.button)
      return false;
    enabled ??= owner.style.selectable;
  }
  return enabled ?? false;
}
