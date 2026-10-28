import { ansi } from "./ansi";

import type { Cell, Screen } from "./screen";

export interface FrameOutput {
  output: string;
  cellsWritten: number;
}
function equal(a: Cell | undefined, b: Cell | undefined): boolean {
  return (
    a?.text === b?.text &&
    a?.continuation === b?.continuation &&
    ansi(a?.style ?? {}) === ansi(b?.style ?? {})
  );
}
export function diff(previous: Screen | undefined, next: Screen): FrameOutput {
  let output = "";
  let cellsWritten = 0;
  for (let y = 0; y < next.height; y++) {
    let end = -1;
    let style = "";
    for (let x = 0; x < next.width; x++) {
      const cell = next.get(x, y);
      if (!cell || equal(previous?.get(x, y), cell) || cell.continuation) continue;
      if (x !== end) output += `\x1b[${y + 1};${x + 1}H`;
      const nextStyle = ansi(cell.style);
      if (nextStyle !== style) {
        output += nextStyle;
        style = nextStyle;
      }
      output += cell.text;
      end = x + (next.get(x + 1, y)?.continuation ? 2 : 1);
      cellsWritten++;
    }
  }
  return { output: output ? output + "\x1b[0m" : "", cellsWritten };
}
