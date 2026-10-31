import type { Element } from "../index";

import { overlay, text } from "../index";
import { columns, graphemes, take, width } from "../src/text/columns";

export const inputWipe = 650;
export const shimmerDuration = 850;
const shimmerPeriod = 1600;
const label = "Generating command...";

export interface Response {
  text: string;
  readyAt: number;
}

export interface Generation {
  prompt: string;
  startedAt: number;
  response?: Response;
}

export function revealAt(generation: Generation): number {
  if (!generation.response) return Infinity;
  const first = generation.startedAt + inputWipe;
  const elapsed = generation.response.readyAt - first;
  return (
    first + Math.max(0, Math.floor(elapsed / shimmerPeriod) + 1) * shimmerPeriod
  );
}

export function generationLine(
  generation: Generation,
  now: number,
  available: number,
): Element {
  const prompt = take(generation.prompt, available);
  const output = take(generation.response?.text ?? "", available);
  const message = take(label, available);
  const elapsed = now - generation.startedAt;
  const reveal = revealAt(generation);
  const size = Math.max(width(message), width(output));
  if (elapsed < inputWipe) return wipe(prompt, message, elapsed / inputWipe);
  const progress =
    now >= reveal
      ? (now - reveal) / shimmerDuration
      : ((elapsed - inputWipe) % shimmerPeriod) / shimmerDuration;
  if (now >= reveal) return wipe(message, output, progress, true);
  return glyphs(message, (x) => {
    const glow = highlight(x, progress, size);
    return { opacity: 0.7 + glow * 0.3, glow };
  });
}

function highlight(x: number, progress: number, size: number): number {
  return Math.max(0, 1 - Math.abs(x - (progress * (size + 8) - 4)) / 4);
}

function wipe(
  from: string,
  to: string,
  progress: number,
  finishing = false,
): Element {
  const size = Math.max(width(from), width(to));
  const front = progress * (size + 8) - 4;
  const mix = (x: number): number =>
    Math.max(0, Math.min(1, (front - x + 4) / 8));
  // A terminal cell holds one glyph, so fade out before replacing it and fading in.
  return overlay(
    glyphs(from, (x) => ({
      opacity: Math.max(0, 1 - mix(x) * 2),
      glow: finishing ? highlight(x, progress, size) : undefined,
    })),
    glyphs(to, (x) => ({
      opacity: Math.max(0, mix(x) * 2 - 1),
      glow: finishing ? undefined : highlight(x, progress, size),
    })),
  )
    .height(1)
    .width("fill")
    .overflow("clip");
}

function glyphs(
  value: string,
  appearance: (x: number) => { opacity: number; glow?: number },
): Element {
  let x = 0;
  return overlay(
    graphemes(value).map((glyph) => {
      const { opacity, glow } = appearance(x);
      const color =
        glow === undefined
          ? undefined
          : ([
              210 + Math.round(45 * glow),
              75 + Math.round(155 * glow),
              235 + Math.round(20 * glow),
            ] as const);
      const cell = text(glyph)
        .position("absolute")
        .left(x)
        .top(0)
        .opacity(opacity);
      x += columns(glyph);
      return color ? cell.color(color) : cell;
    }),
  )
    .height(1)
    .width("fill")
    .overflow("clip");
}
