import type { Cell } from "./buffer";

export interface CellDelta {
  x: number;
  y: number;
  cell: Cell | null;
}

export interface DiffResult {
  writes: CellDelta[];
  skips: number;
}

export function diffCells(
  previous: Map<string, Cell>,
  next: Map<string, Cell>,
): DiffResult {
  const writes: CellDelta[] = [];
  let skips = 0;

  const keys = new Set<string>([...previous.keys(), ...next.keys()]);
  for (const key of keys) {
    const prev = previous.get(key) ?? null;
    const curr = next.get(key) ?? null;
    if (prev && curr) {
      if (
        prev.char === curr.char &&
        shallowEqualStyle(prev.style, curr.style)
      ) {
        skips++;
        continue;
      }
    } else if (!prev && !curr) {
      continue;
    }
    const coords = key.split(",").map((n) => Number.parseInt(n, 10));
    const x = coords[0];
    const y = coords[1];
    if (
      typeof x === "number" &&
      typeof y === "number" &&
      !isNaN(x) &&
      !isNaN(y)
    ) {
      writes.push({ x, y, cell: curr });
    }
  }

  return { writes, skips };
}

function shallowEqualStyle(a: Cell["style"], b: Cell["style"]): boolean {
  return (
    a.foreground === b.foreground &&
    a.background === b.background &&
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.underline === b.underline &&
    a.faint === b.faint
  );
}
