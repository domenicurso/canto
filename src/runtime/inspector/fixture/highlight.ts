import type { Size } from "../../../layout/geometry";
import type { DebugSelection } from "../selection";

import { canvas } from "../../../element/factories";
import { intersect } from "../../../layout/geometry";
import { paint } from "../../../render/painting/paint";
import { inspectionClip, paintBox } from "../box";

/** Paint the preview's diagnostic tint without adding the inspector to its target tree. */
export function fixtureHighlight(model: DebugSelection, size: Size) {
  const root = model.root;
  const node = model.hovered ?? (model.picking ? undefined : model.selected);
  if (!root || !node?.active) return undefined;
  const viewport = {
    x: 0,
    y: 1,
    width: size.width,
    height: Math.max(0, size.height - 1),
  };
  const rect = intersect(node.layout.rect, inspectionClip(node, viewport));
  return canvas((context) => {
    const screen = paint(root, size);
    paintBox(screen, node);
    for (let y = 0; y < rect.height; y++) {
      for (let x = 0; x < rect.width; x++) {
        const cell = screen.get(rect.x + x, rect.y + y);
        if (cell && !cell.continuation)
          context.write(x, y, cell.text, cell.style);
      }
    }
  })
    .position("absolute")
    .left(rect.x)
    .top(rect.y)
    .width(rect.width)
    .height(rect.height);
}
