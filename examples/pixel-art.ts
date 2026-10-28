import type { PixelBuffer } from "../index";

/** Procedural RGBA artwork shared by the graphics and workspace examples. */
export function pixelArt(phase = 0): PixelBuffer {
  const width = 160,
    height = 96;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const wave = Math.sin(x / 17 + phase) * 10 + Math.cos(x / 29 - phase) * 7;
      const ridge = height * 0.52 + wave;
      const sun = (x - width * 0.73) ** 2 + (y - height * 0.3) ** 2 < 13 ** 2;
      const color = sun
        ? [249, 207, 132]
        : y > ridge
          ? [34 + y, 80 + y, 109 + y]
          : [16 + y, 25 + y, 47 + y * 2];
      data.set([...color, 255], (y * width + x) * 4);
    }
  }
  return { width, height, data };
}
