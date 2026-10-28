import { PNG } from "pngjs";

import type { DrawingContext } from "../../index";

export interface Raster {
  width: number;
  height: number;
  data: Uint8Array;
}
export function decodePng(bytes: Uint8Array): Raster {
  return PNG.sync.read(Buffer.from(bytes));
}
export function sampleRaster(): Raster {
  const width = 64;
  const height = 48;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const leaf = ((x - 32) / 21) ** 2 + ((y - 24) / 20) ** 2 < 1;
      data.set(leaf ? [25, 120 + y * 2, 65, 255] : [18, 27, 45, 255], offset);
    }
  }
  return { width, height, data };
}
function pixel(raster: Raster, x: number, y: number): readonly [number, number, number] {
  const offset = (y * raster.width + x) * 4;
  const alpha = (raster.data[offset + 3] ?? 0) / 255;
  return [
    Math.round((raster.data[offset] ?? 0) * alpha),
    Math.round((raster.data[offset + 1] ?? 0) * alpha),
    Math.round((raster.data[offset + 2] ?? 0) * alpha),
  ];
}
export function drawRaster(draw: DrawingContext, raster: Raster): void {
  const scale = Math.min(draw.width / raster.width, (draw.height * 2) / raster.height);
  const width = Math.floor(raster.width * scale);
  const height = Math.floor((raster.height * scale) / 2);
  const left = Math.floor((draw.width - width) / 2);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sourceX = Math.min(raster.width - 1, Math.floor(x / scale));
      const top = Math.min(raster.height - 1, Math.floor((y * 2) / scale));
      const bottom = Math.min(raster.height - 1, Math.floor((y * 2 + 1) / scale));
      draw.write(left + x, y, "▀", {
        foreground: pixel(raster, sourceX, top),
        background: pixel(raster, sourceX, bottom),
      });
    }
  }
}
