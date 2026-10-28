import type { PixelBuffer } from "../element/pixels";
import type { Mounted, Rect } from "../runtime/tree";
import type { GraphicsCapabilities } from "../terminal/graphics-capabilities";
import type { PixelSurface } from "./pixel-surface";
import type { Screen } from "./screen";

import { walk } from "../runtime/tree";
import { rasterize } from "./native-raster";
import { rasterRegions } from "./raster-regions";
import { rasterRenderer } from "./raster-renderer";

export interface RasterPlacement {
  owner: object;
  rect: Rect;
  buffer: PixelBuffer;
  renderer: "kitty" | "sixel";
}
interface CachedRegion {
  owner: object;
  surfaces: readonly (PixelSurface | undefined)[];
  buffer: PixelBuffer;
}
/** Each composition pass retains its own region identities and buffers. */
export class RasterPlacements {
  private readonly regions = new WeakMap<Mounted, Map<string, CachedRegion>>();
  prepare(
    root: Mounted,
    screen: Screen,
    capabilities?: GraphicsCapabilities,
  ): RasterPlacement[] {
    if (!capabilities?.kitty && !capabilities?.sixel) return [];
    const result: RasterPlacement[] = [];
    for (const node of walk(root)) {
      const requested = node.element.data.props.canvas?.renderer ?? "auto";
      const renderer = rasterRenderer(requested, capabilities);
      if (!screen.pixelSources.has(node) || !renderer) continue;
      const previous = this.regions.get(node);
      const next = new Map<string, CachedRegion>();
      for (const rect of rasterRegions(screen, node, renderer)) {
        const key = JSON.stringify([rect, renderer, screen.cellSize]);
        const cached = cachedRegion(previous?.get(key), {
          screen,
          rect,
          renderer,
        });
        next.set(key, cached);
        result.push({
          owner: cached.owner,
          rect,
          buffer: cached.buffer,
          renderer,
        });
      }
      this.regions.set(node, next);
    }
    return result;
  }
}
function cachedRegion(
  previous: CachedRegion | undefined,
  input: {
    screen: Screen;
    rect: Rect;
    renderer: RasterPlacement["renderer"];
  },
): CachedRegion {
  const { screen, rect, renderer } = input;
  const surfaces = [];
  for (let y = rect.y; y < rect.y + rect.height; y++)
    for (let x = rect.x; x < rect.x + rect.width; x++)
      surfaces.push(screen.get(x, y)?.pixels?.surface);
  const unchanged =
    previous &&
    surfaces.length === previous.surfaces.length &&
    surfaces.every((surface, index) => surface === previous.surfaces[index]);
  return {
    owner: previous?.owner ?? {},
    surfaces,
    buffer: unchanged ? previous.buffer : rasterize(rect, screen, renderer),
  };
}
/** Preserve overlay glyphs while removing the quadrant approximation beneath native images. */
export function maskRasterCells(screen: Screen): void {
  for (const image of screen.rasters) maskRegion(screen, image.rect);
}
function maskRegion(screen: Screen, rect: Rect): void {
  for (let y = rect.y; y < rect.y + rect.height; y++) {
    for (let x = rect.x; x < rect.x + rect.width; x++) {
      const index = y * screen.width + x;
      const cell = screen.cells[index];
      if (cell?.pixels && !cell.pixels.text)
        screen.cells[index] = {
          ...cell,
          text: " ",
          continuation: false,
          style: {
            background: screen.pixelBackgrounds
              .get(cell.pixels.owner)
              ?.get(index),
          },
        };
    }
  }
}
