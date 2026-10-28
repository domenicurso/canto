import type { CanvasOptions, PixelBuffer } from "../element/pixels";
import type { Mounted, Rect } from "../runtime/tree";
import type { RGB } from "../style/colors";
import type { Cell } from "./screen";

import { samplePixel } from "./pixel-sampling";

export type PixelSurface = RGB | PixelImage | PixelBlend;
export interface PixelImage {
  source: PixelBuffer;
  area: Rect;
  fit: CanvasOptions["fit"];
  background: PixelSurface;
}
interface PixelBlend {
  top: PixelSurface;
  bottom: PixelSurface;
  opacity: number;
}
export interface PixelCell {
  owner: Mounted;
  surface: PixelSurface;
  text: boolean;
}
export function sampleSurface(
  surface: PixelSurface,
  point: { x: number; y: number },
  cell: { width: number; height: number },
): RGB {
  if ("source" in surface) {
    return samplePixel(
      surface.source,
      {
        x: (point.x - surface.area.x) * cell.width,
        y: (point.y - surface.area.y) * cell.height,
      },
      {
        width: surface.area.width * cell.width,
        height: surface.area.height * cell.height,
        fit: surface.fit,
      },
      sampleSurface(surface.background, point, cell),
    );
  }
  if ("top" in surface) {
    const a = sampleSurface(surface.top, point, cell);
    const b = sampleSurface(surface.bottom, point, cell);
    const channel = (index: number): number =>
      Math.round(
        (a[index] ?? 0) * surface.opacity +
          (b[index] ?? 0) * (1 - surface.opacity),
      );
    return [channel(0), channel(1), channel(2)];
  }
  return surface;
}

export function imageSurface(
  node: Mounted,
  source: PixelBuffer,
  cache: {
    background: RGB;
    previous?: Cell;
    surfaces: Map<string | PixelSurface, PixelImage>;
  },
): PixelImage {
  const { background, previous, surfaces } = cache;
  const key = previous?.pixels?.surface ?? String(background);
  const surface = surfaces.get(key) ?? {
    source,
    area: { ...node.inner },
    fit: node.element.data.props.canvas?.fit,
    background: previous?.pixels?.surface ?? background,
  };
  surfaces.set(key, surface);
  return surface;
}
