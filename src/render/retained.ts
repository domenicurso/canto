import type { PixelBuffer } from "../element/pixels";
import type { Mounted, Rect } from "../runtime/tree";
import type { ColorTheme } from "../style/colors";
import type { CellSize } from "../terminal/cell-size";

import { intersect } from "../layout/geometry";
import { content } from "../layout/measure";
import { activeInteractions } from "../layout/style-parts";
import { draw } from "./paint";
import { Screen } from "./screen";

interface Snapshot {
  signature: string;
  rect: Rect;
  children: readonly Mounted[];
  escapes: boolean;
  pixels?: PixelBuffer;
}
/** Retain cells, then recompose damaged rows through the full stacking and clipping tree. */
export class RetainedPaint {
  private readonly snapshots = new WeakMap<Mounted, Snapshot>();
  private previous?: Screen;
  paintedCells = 0;
  render(
    root: Mounted,
    size: {
      width: number;
      height: number;
      cellSize?: CellSize;
      theme?: ColorTheme;
    },
  ): Screen {
    const bounds = { x: 0, y: 0, ...size };
    const full =
      !this.previous ||
      this.previous.theme !== size.theme ||
      this.previous.width !== size.width ||
      this.previous.height !== size.height ||
      this.previous.cellSize.width !== (size.cellSize?.width ?? 8) ||
      this.previous.cellSize.height !== (size.cellSize?.height ?? 16);
    const rows = new Set<number>();
    this.collect(root, rows, bounds);
    if (full) for (let y = 0; y < size.height; y++) rows.add(y);
    const screen = full
      ? new Screen(size.width, size.height, undefined, size.cellSize)
      : this.previous?.clone();
    if (!screen)
      throw new Error("Retained painting requires a previous frame.");
    screen.theme = size.theme;
    this.paintedCells = rows.size * size.width;
    for (const rect of rowRegions(rows, size.width)) {
      screen.clear(rect);
      draw(root, screen, rect);
    }
    this.previous = screen;
    return screen;
  }
  private collect(node: Mounted, rows: Set<number>, bounds: Rect): void {
    const data = node.element.data;
    const signature = JSON.stringify([
      node.rect,
      node.inner,
      node.style,
      activeInteractions(node),
      node.lines,
      data.runs,
      content(node),
      [node.cursor, node.anchor],
      [node.offset, node.offsetX, node.maxOffset, node.maxOffsetX],
      data.props.scroll?.scrollbar,
      data.props.scroll?.gutter,
      node.element.definition,
    ]);
    const previous = this.snapshots.get(node);
    const escapes =
      node.style.overflow === "visible" ||
      Boolean(node.element.data.props.overlay) ||
      node.children.some((child) => this.snapshots.get(child)?.escapes);
    const childrenChanged =
      !previous ||
      previous.children.length !== node.children.length ||
      node.children.some((child, index) => child !== previous.children[index]);
    if (
      childrenChanged ||
      (previous?.signature !== signature && (previous?.escapes || escapes))
    )
      damage(rows, bounds, bounds);
    else if (
      previous.signature !== signature ||
      previous.pixels !== data.pixels ||
      data.draw
    ) {
      damage(rows, previous.rect, bounds);
      damage(rows, node.rect, bounds);
    }
    this.snapshots.set(node, {
      signature,
      pixels: data.pixels,
      escapes,
      rect: { ...node.rect },
      children: node.children.slice(),
    });
    for (const child of node.children) this.collect(child, rows, bounds);
  }
}
function damage(rows: Set<number>, rect: Rect, bounds: Rect): void {
  const area = intersect(rect, bounds);
  if (!area.width) return;
  for (let y = area.y; y < area.y + area.height; y++) rows.add(y);
}
function rowRegions(rows: Set<number>, width: number): Rect[] {
  const regions: Rect[] = [];
  for (const y of [...rows].sort((a, b) => a - b)) {
    const last = regions.at(-1);
    if (last && last.y + last.height === y) last.height++;
    else regions.push({ x: 0, y, width, height: 1 });
  }
  return regions;
}
