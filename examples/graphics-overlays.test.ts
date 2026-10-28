import { expect, test } from "bun:test";

import type { App, Child } from "../index";

import { createApp, keyEvent, MemoryTerminal } from "../index";
import { Overlays } from "./overlays";
import { Pixels } from "./pixels";
import { Studio } from "./studio/app";

async function session(
  view: () => Child,
  check: (terminal: MemoryTerminal, app: App) => Promise<void>,
): Promise<void> {
  const terminal = new MemoryTerminal(100, 32);
  const app = createApp(view, { terminal });
  const running = app.run();
  try {
    await Bun.sleep(0);
    await check(terminal, app);
  } finally {
    app.stop();
    await running;
  }
}
function click(terminal: MemoryTerminal, label: string): void {
  const lines = terminal.screen?.toString().split("\n") ?? [];
  const y = lines.findIndex((line) => line.includes(label));
  expect(y).toBeGreaterThanOrEqual(0);
  const x = lines[y]?.indexOf(label) ?? 0;
  for (const action of ["press", "release"] as const)
    terminal.dispatch({
      type: "mouse",
      event: { action, x, y, button: 0, deltaY: 0 },
    });
}
function escape(terminal: MemoryTerminal): void {
  terminal.dispatch({ type: "key", event: keyEvent("escape") });
}
test("pixel example changes renderer through an anchored menu, recolors pixels, and opens a modal preview", async () => {
  await session(Pixels, async (terminal, app) => {
    click(terminal, "Renderer");
    await app.flush();
    expect(terminal.screen?.toString()).toContain("Rendering preference");
    click(terminal, "quadrants");
    await app.flush();
    expect(terminal.screen?.toString()).toContain("requested: quadrants");
    expect(terminal.screen?.toString()).not.toContain("Rendering preference");
    const before = terminal.screen?.cells;
    click(terminal, "Recolor");
    await app.flush();
    expect(terminal.screen?.cells).not.toEqual(before);
    click(terminal, "Inspect");
    await app.flush();
    expect(terminal.screen?.toString()).toContain("Programmatic pixel data");
    terminal.resize(40, 14);
    await app.flush();
    expect(terminal.screen?.toString()).toContain("Programmatic pixel data");
    escape(terminal);
    await app.flush();
    expect(terminal.screen?.toString()).not.toContain(
      "Programmatic pixel data",
    );
  });
});
test("overlay example publishes through a focus-trapped dialog and can reset through its popover", async () => {
  await session(Overlays, async (terminal, app) => {
    click(terminal, "Review draft");
    await app.flush();
    expect(terminal.screen?.toString()).toContain("Publish this draft?");
    terminal.dispatch({ type: "key", event: keyEvent("a", { ctrl: true }) });
    terminal.dispatch({
      type: "key",
      event: keyEvent("paste", { text: "Release v2" }),
    });
    await app.flush();
    terminal.dispatch({ type: "key", event: keyEvent("tab") });
    terminal.dispatch({ type: "key", event: keyEvent("enter") });
    await app.flush();
    expect(terminal.screen?.toString()).toContain(
      "Published in this session: Release v2",
    );
    click(terminal, "Actions");
    await app.flush();
    click(terminal, "Reset status");
    await app.flush();
    expect(terminal.screen?.toString()).toContain("Draft ready");
  });
});
test("Studio opens a pixel artwork preview and restores its queue after dismissal", async () => {
  await session(Studio, async (terminal, app) => {
    click(terminal, "Artwork");
    await app.flush();
    expect(terminal.screen?.toString()).toContain("Release artwork");
    escape(terminal);
    await app.flush();
    expect(terminal.screen?.toString()).not.toContain("Release artwork");
    expect(terminal.screen?.toString()).toContain("Release queue");
  });
});
