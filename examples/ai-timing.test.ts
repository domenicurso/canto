import { expect, test } from "bun:test";

import type { Generation } from "./ai-line";

import { createApp, MemoryTerminal } from "../index";
import { rgb } from "../src/style/colors";
import {
  generationLine,
  revealAt,
  revealDuration,
  shimmerDuration,
} from "./ai-line";

async function frame(generation: Generation, time: number) {
  const terminal = new MemoryTerminal(80, 2);
  const app = createApp(() => generationLine(generation, time, 80), {
    terminal,
  });
  const running = app.run();
  try {
    await Bun.sleep(0);
    return terminal.screen;
  } finally {
    app.stop();
    await running;
  }
}

test("a longer response keeps the shimmer speed and extends the final reveal", async () => {
  const pending: Generation = {
    prompt: "request",
    message: "Working on it…",
    startedAt: 0,
  };
  const ready: Generation = {
    ...pending,
    response: { text: "find . -type f -mtime -1 -print", readyAt: 1200 },
  };
  const before = await frame(pending, 950);
  const after = await frame(ready, 950);
  expect(after?.toString()).toBe(before?.toString());
  for (let x = 0; x < pending.message.length; x++)
    expect(after?.get(x, 0)?.style).toEqual(before?.get(x, 0)?.style);
  const duration = revealDuration(ready, 80);
  expect(duration).toBeGreaterThan(shimmerDuration);
  const reveal = revealAt(ready);
  const partial = await frame(ready, reveal + shimmerDuration);
  expect(partial?.toString()).not.toContain(ready.response?.text ?? "");
  const done = await frame(ready, reveal + duration);
  expect(done?.toString()).toContain(ready.response?.text ?? "");
});

test("the final wipe advances the same number of columns per second as the shimmer", async () => {
  const generation: Generation = {
    prompt: "request",
    message: "Working on it…",
    startedAt: 0,
    response: { text: "find . -type f -mtime -1 -print", readyAt: 1200 },
  };
  // Two columns ahead of the peak, the old glyph should be halfway through its fade.
  const elapsed =
    ((6 + 2) / (Bun.stringWidth(generation.message) + 8)) * shimmerDuration;
  const pending = await frame(
    { ...generation, response: undefined },
    650 + elapsed,
  );
  const color = rgb(pending?.get(6, 0)?.style.foreground);
  const finishing = await frame(generation, revealAt(generation) + elapsed);
  expect([...rgb(finishing?.get(6, 0)?.style.foreground)]).toEqual(
    color.map((channel) => Math.round(channel / 2)),
  );
  expect(revealDuration(generation, 10)).toBe(shimmerDuration);
});
