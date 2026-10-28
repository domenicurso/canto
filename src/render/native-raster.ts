import type { PixelBuffer } from "../element/pixels";
import type { Rect } from "../runtime/tree";
import type { CellSize } from "../terminal/cell-size";
import type { PixelImage, PixelSurface } from "./pixel-surface";
import type { RasterPlacement } from "./raster-placement";
import type { Screen } from "./screen";

import { nativeSize } from "./pixel-sampling";
import { opaquePixels, rasterSurface } from "./raster-surface";

export function rasterize(
  rect: Rect,
  screen: Screen,
  renderer: RasterPlacement["renderer"],
): PixelBuffer {
  const surface = screen.get(rect.x, rect.y)?.pixels?.surface;
  if (!surface)
    throw new Error("A native raster region must contain pixel surfaces.");
  const size = surfaceSize(surface, { rect, cell: screen.cellSize, renderer });
  if ("source" in surface && matchesSurface(surface, rect, size))
    return surface.source;
  return rasterSurface(surface, { rect, cell: screen.cellSize, ...size });
}
function surfaceSize(
  surface: PixelSurface,
  target: { rect: Rect; cell: CellSize; renderer: RasterPlacement["renderer"] },
): { width: number; height: number } {
  if ("top" in surface) {
    const a = surfaceSize(surface.top, target),
      b = surfaceSize(surface.bottom, target);
    return {
      width: Math.max(a.width, b.width),
      height: Math.max(a.height, b.height),
    };
  }
  if (!("source" in surface)) return { width: 1, height: 1 };
  const size = nativeSize(surface.source, {
    ...target,
    area: surface.area,
    fit: surface.fit,
  });
  const background = surfaceSize(surface.background, target);
  return {
    width: Math.max(size.width, background.width),
    height: Math.max(size.height, background.height),
  };
}
function matchesSurface(
  surface: PixelImage,
  rect: Rect,
  size: { width: number; height: number },
): boolean {
  const { source, area } = surface;
  if (
    JSON.stringify(rect) !== JSON.stringify(area) ||
    size.width !== source.width ||
    size.height !== source.height
  )
    return false;
  return opaquePixels(source);
}
