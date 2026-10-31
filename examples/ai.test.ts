import { expect, test } from "bun:test";

import type { ColorTheme } from "../index";
import type { Screen } from "../src/render/screen";
import type { Generation } from "./ai-line";

import { createApp, keyEvent, MemoryTerminal } from "../index";
import { rgb } from "../src/style/colors";
import { GenerateText } from "./ai";
import { generationLine, revealAt } from "./ai-line";

test("responses wait for a new shimmer, including readiness during a pass", () => {
  const generation = { prompt: "request", startedAt: 100 };
  expect(revealAt(generation)).toBe(Infinity);
  const ready = (readyAt: number): Generation => ({
    ...generation,
    response: { text: "command", readyAt },
  });
  expect(revealAt(ready(200))).toBe(750);
  expect(revealAt(ready(750))).toBe(2350);
  expect(revealAt(ready(1000))).toBe(2350);
  expect(revealAt(ready(2400))).toBe(3950);
});

async function frame(
  generation: Generation,
  time: number,
  width = 60,
  theme?: ColorTheme,
): Promise<Screen | undefined> {
  const terminal = new MemoryTerminal(width, 2);
  terminal.theme = theme;
  const app = createApp(() => generationLine(generation, time, width), {
    terminal,
    mode: "inline",
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

test("the wipe moves left to right and fades characters using opacity", async () => {
  const generation = { prompt: "xxxxxxxxxxxxxxxxxxxx", startedAt: 0 };
  expect((await frame(generation, 0))?.toString()).toContain(generation.prompt);
  const middle = await frame(generation, 325);
  expect(middle?.toString()).toContain("Generat");
  expect(middle?.toString()).toContain("xxxxxxxx");
  expect(middle?.get(0, 0)?.style.foreground).not.toEqual(
    middle?.get(8, 0)?.style.foreground,
  );
  expect((await frame(generation, 650))?.toString()).toContain(
    "Generating command...",
  );
});

test("the magenta shimmer repeats and reveals only on the next pass", async () => {
  const generation: Generation = {
    prompt: "request",
    startedAt: 0,
    response: { text: "echo ready", readyAt: 1200 },
  };
  const first = await frame(generation, 950);
  const repeated = await frame({ ...generation, response: undefined }, 2550);
  expect(first?.get(4, 0)?.style.foreground).toEqual(
    repeated?.get(4, 0)?.style.foreground,
  );
  expect(first?.get(4, 0)?.style.foreground).not.toEqual(
    first?.get(15, 0)?.style.foreground,
  );
  expect((await frame(generation, 2200))?.toString()).toContain(
    "Generating command...",
  );
  const middle = await frame(generation, 2675);
  expect(middle?.toString()).toContain("echo");
  expect(middle?.toString()).toContain("command...");
  expect((await frame(generation, 3100))?.toString()).toContain("echo ready");
});

test("the shimmer blends the terminal's white over its magenta palette color", async () => {
  const theme: ColorTheme = {
    foreground: [200, 180, 160],
    background: [10, 20, 30],
    palette: { 5: [120, 40, 160], 7: [240, 220, 200] },
  };
  const generation = { prompt: "request", startedAt: 0 };
  const screen = await frame(generation, 650 + (10 / 29) * 850, 60, theme);
  expect(rgb(screen?.get(6, 0)?.style.foreground, theme)).toEqual([
    240, 220, 200,
  ]);
  expect(rgb(screen?.get(4, 0)?.style.foreground, theme)).toEqual([
    180, 130, 180,
  ]);
  expect(screen?.get(15, 0)?.style.foreground).toBe("magenta");
  const initial = await frame(generation, 0, 60, theme);
  expect(initial?.get(0, 0)?.style.foreground).toBeUndefined();
});

test("the animation clips wide graphemes to one terminal line", async () => {
  const generation = { prompt: "界👩‍💻é hello", startedAt: 0 };
  const screen = await frame(generation, 0, 5);
  expect(screen?.toString().split("\n")[0]).toBe("界👩‍💻é");
  expect(screen?.toString().split("\n")[1]?.trim() ?? "").toBe("");
});

test("Alt+Enter generates once, holds the response, and Escape restores editing", async () => {
  const terminal = new MemoryTerminal(80, 3);
  const requests: string[] = [];
  const generate = async (prompt: string): Promise<string> => {
    requests.push(prompt);
    return "echo ready";
  };
  const app = createApp(() => GenerateText({ generate }), {
    terminal,
    mode: "inline",
  });
  const running = app.run();
  try {
    await Bun.sleep(0);
    terminal.dispatch({ type: "key", event: keyEvent("enter") });
    await app.flush();
    expect(requests).toHaveLength(0);
    terminal.dispatch({ type: "key", event: keyEvent("enter", { alt: true }) });
    await app.flush();
    await Bun.sleep(0);
    terminal.dispatch({ type: "key", event: keyEvent("enter", { alt: true }) });
    await app.flush();
    expect(requests).toEqual(["Find files modified in the last 24 hours"]);
    expect(terminal.screen?.toString()).not.toContain("echo ready");
    await Bun.sleep(1600);
    await app.flush();
    expect(terminal.screen?.toString()).toContain("echo ready");
    terminal.dispatch({ type: "key", event: keyEvent("escape") });
    await app.flush();
    expect(terminal.screen?.toString()).toContain(requests[0] ?? "");
    terminal.dispatch({ type: "key", event: keyEvent("x", { text: "x" }) });
    await app.flush();
    expect(terminal.screen?.toString()).toContain("x");
  } finally {
    app.stop();
    await running;
  }
});
