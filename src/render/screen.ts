import type { Rect } from "../runtime/tree";
import type { Style } from "../style/types";

import { contains } from "../layout/geometry";
import { columns, graphemes } from "../text/columns";

export interface Cell {
  text: string;
  style: Style;
  continuation: boolean;
}
export class Screen {
  readonly cells: Cell[];
  constructor(
    readonly width: number,
    readonly height: number,
    previous?: Screen,
  ) {
    this.cells = previous
      ? previous.cells.slice()
      : Array.from({ length: width * height }, () => ({
          text: " ",
          style: {},
          continuation: false,
        }));
  }
  clone(): Screen {
    const copy = new Screen(this.width, this.height, this);
    return copy;
  }
  clear(rect: Rect): void {
    for (let y = rect.y; y < rect.y + rect.height; y++)
      for (let x = rect.x; x < rect.x + rect.width; x++)
        this.cells[y * this.width + x] = {
          text: " ",
          style: {},
          continuation: false,
        };
  }
  get(x: number, y: number): Cell | undefined {
    return this.cells[y * this.width + x];
  }
  put(rect: Rect, text: string, style: Style, clip: Rect): void {
    let x = rect.x;
    for (const part of graphemes(text)) {
      const size = columns(part);
      if (!size) continue;
      if (contains(clip, x, rect.y) && contains(clip, x + size - 1, rect.y))
        this.write({ x, y: rect.y }, part, size, style);
      x += size;
    }
  }
  private write(
    point: { x: number; y: number },
    text: string,
    size: number,
    style: Style,
  ): void {
    const { x, y } = point;
    style = {
      ...style,
      background:
        style.background === undefined
          ? this.get(x, y)?.style.background
          : style.background,
    };
    if (x < 0 || y < 0 || x + size > this.width || y >= this.height) return;
    this.eraseWide(x, y);
    if (size === 2) this.eraseWide(x + 1, y);
    this.cells[y * this.width + x] = { text, style, continuation: false };
    if (size === 2)
      this.cells[y * this.width + x + 1] = {
        text: "",
        style,
        continuation: true,
      };
  }
  private eraseWide(x: number, y: number): void {
    const cell = this.get(x, y);
    if (cell?.continuation && x > 0)
      this.cells[y * this.width + x - 1] = {
        text: " ",
        style: cell.style,
        continuation: false,
      };
    if (
      !cell?.continuation &&
      this.get(x + 1, y)?.continuation &&
      x + 1 < this.width
    ) {
      this.cells[y * this.width + x + 1] = {
        text: " ",
        style: cell?.style ?? {},
        continuation: false,
      };
    }
  }
  toString(): string {
    return Array.from({ length: this.height }, (_, y) =>
      this.cells
        .slice(y * this.width, (y + 1) * this.width)
        .map((cell) => cell.text)
        .join("")
        .trimEnd(),
    ).join("\n");
  }
}
