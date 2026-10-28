import type { PixelBuffer } from "../element/pixels";
import type { Mounted, Rect } from "../runtime/tree";
import type { GraphicsCapabilities } from "../terminal/graphics-capabilities";
import type { Screen } from "./screen";

import { intersect } from "../layout/geometry";
import { hit } from "../runtime/focus";
import { walk } from "../runtime/tree";
import { rasterize } from "./native-raster";

export interface RasterPlacement {
  owner: object;
  rect: Rect;
  buffer: PixelBuffer;
  renderer: "kitty" | "sixel";
}
const scaled = new WeakMap<
  Mounted,
  { source: PixelBuffer; signature: string; buffer: PixelBuffer }
>();
function cachedRaster(
  node: Mounted,
  rect: Rect,
  screen: Screen,
  renderer: RasterPlacement["renderer"],
): PixelBuffer {
  const source = screen.pixelSources.get(node);
  const signature = JSON.stringify([
    [node.inner.width, node.inner.height],
    [rect.x - node.inner.x, rect.y - node.inner.y, rect.width, rect.height],
    renderer,
    screen.cellSize,
    node.element.data.props.canvas?.fit,
    underlay(node, rect, screen),
  ]);
  const previous = scaled.get(node);
  if (source && previous?.source === source && previous.signature === signature)
    return previous.buffer;
  const buffer = rasterize(node, rect, screen, renderer);
  if (source) scaled.set(node, { source, signature, buffer });
  return buffer;
}
export function rasterPlacements(
  root: Mounted,
  screen: Screen,
  capabilities?: GraphicsCapabilities,
): RasterPlacement[] {
  if (!capabilities?.kitty && !capabilities?.sixel) return [];
  const result: RasterPlacement[] = [];
  for (const node of walk(root)) {
    const requested = node.element.data.props.canvas?.renderer ?? "auto";
    const renderer =
      requested === "quadrants"
        ? undefined
        : capabilities.kitty && requested !== "sixel"
          ? "kitty"
          : capabilities.sixel && requested !== "kitty"
            ? "sixel"
            : undefined;
    if (!screen.pixelSources.has(node) || !renderer) continue;
    const rect = visibleRect(node, screen);
    if (!rect.width || !rect.height || !uncovered(root, node, rect)) continue;
    result.push({
      owner: node,
      rect,
      buffer: cachedRaster(node, rect, screen, renderer),
      renderer,
    });
  }
  return result;
}
function visibleRect(node: Mounted, screen: Screen): Rect {
  let rect = intersect(node.inner, {
    x: 0,
    y: 0,
    width: screen.width,
    height: screen.height,
  });
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (node.element.data.props.overlay) break;
    if (parent.style.overflow !== "visible")
      rect = intersect(rect, parent.inner);
    if (parent.element.data.props.overlay) break;
  }
  return rect;
}
function uncovered(root: Mounted, node: Mounted, rect: Rect): boolean {
  for (let y = rect.y; y < rect.y + rect.height; y++)
    for (let x = rect.x; x < rect.x + rect.width; x++)
      if (hit(root, { x, y }, root.rect) !== node) return false;
  return true;
}

function underlay(node: Mounted, rect: Rect, screen: Screen): string {
  const colors: string[] = [];
  const backgrounds = screen.pixelBackgrounds.get(node);
  for (let y = rect.y; y < rect.y + rect.height; y++)
    for (let x = rect.x; x < rect.x + rect.width; x++)
      colors.push(String(backgrounds?.get(y * screen.width + x)));
  return colors.join(";");
}

/** Native graphics cover stable blank cells, so animation never redraws its fallback underneath. */
export function maskRasterCells(screen: Screen): void {
  for (const image of screen.rasters) {
    const backgrounds = screen.pixelBackgrounds.get(image.owner);
    for (let y = image.rect.y; y < image.rect.y + image.rect.height; y++) {
      for (let x = image.rect.x; x < image.rect.x + image.rect.width; x++) {
        const index = y * screen.width + x;
        screen.cells[index] = {
          text: " ",
          style: { background: backgrounds?.get(index) },
          continuation: false,
        };
      }
    }
  }
}
