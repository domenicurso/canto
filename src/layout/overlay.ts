import type { Mounted, Rect } from "../runtime/tree";
import type { Place } from "./flow";

import { overlays } from "../runtime/overlays";
import { measure } from "./measure";

export function placeOverlays(root: Mounted, place: Place): void {
  for (const node of overlays(root)) {
    const options = node.element.data.props.overlay;
    if (!options) continue;
    const viewport = root.rect;
    const natural = measure(node, viewport);
    const width = Math.min(viewport.width, natural.width);
    const height = Math.min(viewport.height, natural.height);
    const anchor = options.anchor?.();
    const rect =
      anchor && options.placement !== "center"
        ? anchored({
            anchor,
            viewport,
            width,
            height,
            placement: options.placement ?? "bottom-start",
            offset: options.offset ?? 0,
          })
        : {
            x: viewport.x + Math.floor((viewport.width - width) / 2),
            y: viewport.y + Math.floor((viewport.height - height) / 2),
            width,
            height,
          };
    place(node, rect);
  }
}
function anchored(options: {
  anchor: Readonly<Rect>;
  viewport: Rect;
  width: number;
  height: number;
  placement: string;
  offset: number;
}): Rect {
  const { anchor, viewport, width, height, placement, offset } = options;
  const bottom = anchor.y + anchor.height + offset;
  const top = anchor.y - height - offset;
  const preferTop = placement.startsWith("top");
  let y = preferTop ? top : bottom;
  if (
    preferTop &&
    top < viewport.y &&
    bottom + height <= viewport.y + viewport.height
  )
    y = bottom;
  if (
    !preferTop &&
    bottom + height > viewport.y + viewport.height &&
    top >= viewport.y
  )
    y = top;
  const x = placement.endsWith("end")
    ? anchor.x + anchor.width - width
    : anchor.x;
  return {
    x: Math.max(viewport.x, Math.min(x, viewport.x + viewport.width - width)),
    y: Math.max(viewport.y, Math.min(y, viewport.y + viewport.height - height)),
    width,
    height,
  };
}
