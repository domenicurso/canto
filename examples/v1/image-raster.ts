import { PNG } from "pngjs";

import type { PixelBuffer } from "../../index";

export function decodePng(bytes: Uint8Array): PixelBuffer {
  return PNG.sync.read(Buffer.from(bytes));
}
export function sampleRaster(): PixelBuffer {
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
