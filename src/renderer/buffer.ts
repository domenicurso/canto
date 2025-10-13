import type { StyleSnapshot } from "../style";
import type { LayoutRect } from "../types";

export interface Cell {
  char: string;
  style: StyleSnapshot;
}

export class CellBuffer {
  readonly cells = new Map<string, Cell>();
  bounds: LayoutRect = { x: 0, y: 0, width: 0, height: 0 };

  private key(x: number, y: number): string {
    return `${x},${y}`;
  }

  get(x: number, y: number): Cell | undefined {
    return this.cells.get(this.key(x, y));
  }

  set(x: number, y: number, cell: Cell): void {
    this.cells.set(this.key(x, y), cell);
  }

  delete(x: number, y: number): void {
    this.cells.delete(this.key(x, y));
  }

  clear(): void {
    this.cells.clear();
  }
}
