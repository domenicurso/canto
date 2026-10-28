import type { PixelBuffer } from "../element/pixels";
import type { Mounted, Rect } from "../runtime/tree";
import type { RGB } from "../style/colors";
import type { Screen } from "./screen";

import { rgb } from "../style/colors";
import { samplePixel } from "./pixel-sampling";

const samplePoints = [
  [0.25, 0.25],
  [0.75, 0.25],
  [0.25, 0.75],
  [0.75, 0.75],
] as const;
const blocks = " ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█";
export function drawPixels(
  node: Mounted,
  screen: Screen,
  clip: Rect,
  source: PixelBuffer | undefined = node.element.data.pixels,
): void {
  if (!source) return;
  screen.pixelSources.set(node, source);
  const backgrounds = new Map(screen.pixelBackgrounds.get(node));
  screen.pixelBackgrounds.set(node, backgrounds);
  const { inner: area } = node,
    cell = screen.cellSize;
  const target = {
    width: node.inner.width * cell.width,
    height: node.inner.height * cell.height,
    fit: node.element.data.props.canvas?.fit,
  };
  for (let y = clip.y; y < clip.y + clip.height; y++) {
    for (let x = clip.x; x < clip.x + clip.width; x++) {
      const background = rgb(screen.get(x, y)?.style.background);
      backgrounds.set(y * screen.width + x, background);
      const samples = samplePoints.map(([dx, dy]) =>
        samplePixel(
          source,
          {
            x: (x - area.x + dx) * cell.width,
            y: (y - area.y + dy) * cell.height,
          },
          target,
          background,
        ),
      );
      const encoded = quadrant(samples);
      screen.put(
        { x, y, width: 1, height: 1 },
        encoded.text,
        {
          ...node.style,
          foreground: encoded.foreground,
          background: encoded.background,
        },
        clip,
      );
    }
  }
}
export function quadrant(samples: readonly RGB[]): {
  text: string;
  foreground: RGB;
  background: RGB;
} {
  let best: { mask: number; error: number; foreground: RGB; background: RGB } =
    {
      mask: 0,
      error: Infinity,
      foreground: samples[0] ?? [0, 0, 0],
      background: samples[0] ?? [0, 0, 0],
    };
  for (let mask = 0; mask < 8; mask++) {
    const foreground = mean(
      samples.filter((_, index) => Boolean(mask & (1 << index))),
    );
    const background = mean(
      samples.filter((_, index) => !(mask & (1 << index))),
    );
    const error = samples.reduce(
      (sum, sample, index) =>
        sum +
        sample.reduce(
          (total, channel, c) =>
            total +
            (channel -
              ((mask & (1 << index) ? foreground : background)[c] ?? 0)) **
              2,
          0,
        ),
      0,
    );
    if (error < best.error) best = { mask, error, foreground, background };
  }
  return {
    text: blocks[best.mask] ?? " ",
    foreground: best.foreground,
    background: best.background,
  };
}
function mean(samples: readonly RGB[]): RGB {
  const channel = (index: number): number =>
    Math.round(
      samples.reduce((sum, color) => sum + (color[index] ?? 0), 0) /
        Math.max(1, samples.length),
    );
  return [channel(0), channel(1), channel(2)];
}
