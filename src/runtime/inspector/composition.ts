import type { Rect } from "../../layout/geometry";
import type { Screen } from "../../render/screen";

import { intersect } from "../../layout/geometry";

export function composeInspector(
  screen: Screen,
  layer: Screen,
  rect: Rect,
): void {
  const area = intersect(rect, {
    x: 0,
    y: 0,
    width: screen.width,
    height: screen.height,
  });
  // Inspector surfaces are opaque; copying cells also occludes native image ownership.
  for (let y = area.y; y < area.y + area.height; y++) {
    screen.touchRow(y);
    for (let x = area.x; x < area.x + area.width; x++) {
      const index = y * screen.width + x;
      const cell = layer.cells[index];
      if (cell) screen.cells[index] = cell;
    }
  }
}
