import type { PixelBuffer } from "../index";

export const waveformBackground = [15, 23, 42] as const;
const gridColor = [40, 55, 75, 255] as const;
/** Fill the static grid in bulk, then shade only the narrow antialiased stroke. */
export function waveform(
  width: number,
  height: number,
  phase: number,
): PixelBuffer {
  const data = Buffer.alloc(
    width * height * 4,
    Buffer.from([...waveformBackground, 255]),
  );
  const gridX = Math.max(1, Math.round(width / 8));
  const gridY = Math.max(1, Math.round(height / 4));
  for (let y = gridY; y < height; y += gridY)
    data.fill(Buffer.from(gridColor), y * width * 4, (y + 1) * width * 4);
  for (let x = gridX; x < width; x += gridX)
    for (let y = 0; y < height; y++) data.set(gridColor, (y * width + x) * 4);
  const frequency = (Math.PI * 4) / width;
  for (let x = 0; x < width; x++) {
    const angle = (x + 0.5) * frequency + phase;
    const wave = height / 2 - Math.sin(angle) * height * 0.35;
    const normal = Math.hypot(1, Math.cos(angle) * height * 0.35 * frequency);
    const start = Math.max(0, Math.ceil(wave - 1.75 * normal - 0.5));
    const end = Math.min(height - 1, Math.floor(wave + 1.75 * normal - 0.5));
    for (let y = start; y <= end; y++) {
      const coverage = Math.max(
        0,
        Math.min(1, 1.75 - Math.abs(y + 0.5 - wave) / normal),
      );
      const offset = (y * width + x) * 4;
      data[offset] = Math.round(
        (data[offset] ?? 0) * (1 - coverage) + 103 * coverage,
      );
      data[offset + 1] = Math.round(
        (data[offset + 1] ?? 0) * (1 - coverage) + 232 * coverage,
      );
      data[offset + 2] = Math.round(
        (data[offset + 2] ?? 0) * (1 - coverage) + 249 * coverage,
      );
    }
  }
  return { width, height, data };
}
