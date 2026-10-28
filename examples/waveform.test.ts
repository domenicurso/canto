import { expect, test } from "bun:test";

import { waveform, waveformBackground } from "./waveform";

test.each([
  [1, 1],
  [19, 11],
  [40, 32],
] as const)(
  "bulk grid filling and narrow stroke shading preserve every %dx%d waveform pixel",
  (width, height) => {
    for (const phase of [0, 0.2, 4]) {
      const actual = waveform(width, height, phase);
      for (let x = 0; x < width; x++) {
        const frequency = (Math.PI * 4) / width;
        const angle = (x + 0.5) * frequency + phase;
        const wave = height / 2 - Math.sin(angle) * height * 0.35;
        const normal = Math.hypot(
          1,
          Math.cos(angle) * height * 0.35 * frequency,
        );
        for (let y = 0; y < height; y++) {
          const grid =
            (x > 0 && x % Math.max(1, Math.round(width / 8)) === 0) ||
            (y > 0 && y % Math.max(1, Math.round(height / 4)) === 0);
          const coverage = Math.max(
            0,
            Math.min(1, 1.75 - Math.abs(y + 0.5 - wave) / normal),
          );
          const background = grid ? [40, 55, 75] : waveformBackground;
          const expected = [103, 232, 249].map((color, i) =>
            Math.round(
              (background[i] ?? 0) * (1 - coverage) + color * coverage,
            ),
          );
          expect(
            Array.from(
              actual.data.slice((y * width + x) * 4, (y * width + x) * 4 + 4),
            ),
          ).toEqual([...expected, 255]);
        }
      }
    }
  },
);
