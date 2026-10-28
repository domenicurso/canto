import type { PixelBuffer } from "../element/pixels";
import type { Rect } from "../runtime/tree";
import type { CellSize } from "../terminal/cell-size";
import type { PixelImage, PixelSurface } from "./pixel-surface";

import { sampleSurface } from "./pixel-surface";

export interface RasterTarget {
  rect: Rect;
  cell: CellSize;
  width: number;
  height: number;
}
/** Copy aligned native pixels by row; tint only the overlapping region. */
export function rasterSurface(
  surface: PixelSurface,
  target: RasterTarget,
): PixelBuffer {
  if ("top" in surface) {
    const bottom = rasterSurface(surface.bottom, target);
    if (!("source" in surface.top) && !("top" in surface.top)) {
      tint(bottom.data, surface.top, surface.opacity);
      return bottom;
    }
    const top = rasterSurface(surface.top, target);
    for (let offset = 0; offset < bottom.data.length; offset++)
      bottom.data[offset] = Math.round(
        (top.data[offset] ?? 0) * surface.opacity +
          (bottom.data[offset] ?? 0) * (1 - surface.opacity),
      );
    return bottom;
  }
  const data = new Uint8Array(target.width * target.height * 4);
  if (!("source" in surface)) {
    for (let offset = 0; offset < data.length; offset += 4)
      data.set([...surface, 255], offset);
  } else if (!copyAligned(surface, target, data))
    sampleRegion(surface, target, data);
  return { width: target.width, height: target.height, data };
}
function tint(
  data: PixelBuffer["data"],
  color: readonly number[],
  opacity: number,
): void {
  const inverse = 1 - opacity;
  const r = (color[0] ?? 0) * opacity;
  const g = (color[1] ?? 0) * opacity;
  const b = (color[2] ?? 0) * opacity;
  for (let offset = 0; offset < data.length; offset += 4) {
    data[offset] = Math.round((data[offset] ?? 0) * inverse + r);
    data[offset + 1] = Math.round((data[offset + 1] ?? 0) * inverse + g);
    data[offset + 2] = Math.round((data[offset + 2] ?? 0) * inverse + b);
  }
}
const opaque = new WeakMap<PixelBuffer, boolean>();
export function opaquePixels(source: PixelBuffer): boolean {
  const cached = opaque.get(source);
  if (cached !== undefined) return cached;
  for (let offset = 3; offset < source.data.length; offset += 4) {
    if (source.data[offset] !== 255) {
      opaque.set(source, false);
      return false;
    }
  }
  opaque.set(source, true);
  return true;
}
function copyAligned(
  surface: PixelImage,
  target: RasterTarget,
  data: Uint8Array,
): boolean {
  const { source, area, fit } = surface;
  const sx = source.width / area.width,
    sy = source.height / area.height;
  const x = (target.rect.x - area.x) * sx,
    y = (target.rect.y - area.y) * sy;
  if (
    (fit !== "fill" &&
      source.width * target.cell.height * area.height !==
        source.height * target.cell.width * area.width) ||
    target.width !== target.rect.width * sx ||
    target.height !== target.rect.height * sy ||
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    !opaquePixels(source)
  )
    return false;
  for (let row = 0; row < target.height; row++) {
    const start = ((y + row) * source.width + x) * 4;
    data.set(
      source.data.subarray(start, start + target.width * 4),
      row * target.width * 4,
    );
  }
  return true;
}
function sampleRegion(
  surface: PixelSurface,
  target: RasterTarget,
  data: Uint8Array,
): void {
  const { width, height, rect, cell } = target;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = sampleSurface(
        surface,
        {
          x: rect.x + ((x + 0.5) * rect.width) / width,
          y: rect.y + ((y + 0.5) * rect.height) / height,
        },
        cell,
      );
      const offset = (y * width + x) * 4;
      data[offset] = color[0];
      data[offset + 1] = color[1];
      data[offset + 2] = color[2];
      data[offset + 3] = 255;
    }
  }
}
