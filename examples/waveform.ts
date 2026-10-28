import type { PixelBuffer } from "../index";

/** Rasterize at terminal pixel resolution with a one-pixel antialiasing edge. */
export function waveform(
  width: number,
  height: number,
  phase: number,
): PixelBuffer {
  const data = new Uint8Array(width * height * 4);
  const frequency = (Math.PI * 4) / width;
  for (let x = 0; x < width; x++) {
    const angle = (x + 0.5) * frequency + phase;
    const wave = height / 2 - Math.sin(angle) * height * 0.35;
    const normal = Math.hypot(1, Math.cos(angle) * height * 0.35 * frequency);
    const verticalGrid = x % Math.max(1, Math.round(width / 8)) === 0;
    for (let y = 0; y < height; y++) {
      const grid =
        verticalGrid || y % Math.max(1, Math.round(height / 4)) === 0;
      const coverage = Math.max(
        0,
        Math.min(1, 1.75 - Math.abs(y + 0.5 - wave) / normal),
      );
      const offset = (y * width + x) * 4;
      data[offset] = Math.round(
        (grid ? 40 : 15) * (1 - coverage) + 103 * coverage,
      );
      data[offset + 1] = Math.round(
        (grid ? 55 : 23) * (1 - coverage) + 232 * coverage,
      );
      data[offset + 2] = Math.round(
        (grid ? 75 : 42) * (1 - coverage) + 249 * coverage,
      );
      data[offset + 3] = 255;
    }
  }
  return { width, height, data };
}
