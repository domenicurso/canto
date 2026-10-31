import type { Element } from "../index";

import { overlay, text } from "../index";
import { columns, graphemes, take, width } from "../src/text/columns";

export const inputWipe = 650;
export const shimmerDuration = 850;
const shimmerPeriod = 1600;
const messages = [
  "Working on it…",
  "Putting it together…",
  "Finding the right words…",
  "Thinking in shell…",
  "Sorting out the flags…",
  "Connecting the dots…",
  "Checking the syntax…",
  "Working out the details…",
  "Taking a closer look…",
  "Getting there…",
  "A little more thought…",
  "Finding a way…",
  "Making it fit…",
  "Lining things up…",
  "Almost have it…",
] as const;

export interface Response {
  text: string;
  readyAt: number;
}

export interface Generation {
  prompt: string;
  message: string;
  startedAt: number;
  response?: Response;
}

export function startGeneration(prompt: string, startedAt: number): Generation {
  // Math.random() is in [0, 1), so this index always belongs to the nonempty list.
  const message = messages[Math.floor(Math.random() * messages.length)]!;
  return { prompt, message, startedAt };
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
  const message = take(generation.message, available);
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
    return { opacity: 1, glow };
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
      const content =
        glow === undefined
          ? text(glyph)
          : overlay(
              text(glyph).color("magenta"),
              text(glyph).color("#fff").opacity(glow),
            );
      const cell = content
        .position("absolute")
        .left(x)
        .top(0)
        .width(columns(glyph))
        .height(1)
        .opacity(opacity);
      x += columns(glyph);
      return cell;
    }),
  )
    .height(1)
    .width("fill")
    .overflow("clip");
}
