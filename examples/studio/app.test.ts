import { expect, test } from "bun:test";

import type { App, KeyEvent } from "../../index";

import { createApp, keyEvent, MemoryTerminal } from "../../index";
import { Studio } from "./app";

async function session(
  size: [number, number],
  check: (terminal: MemoryTerminal, app: App) => Promise<void>,
): Promise<void> {
  const terminal = new MemoryTerminal(...size);
  const app = createApp(Studio, { terminal });
  const running = app.run();
  try {
    await Bun.sleep(0);
    await check(terminal, app);
  } finally {
    app.stop();
    await running;
  }
  expect(terminal.stopped).toBe(true);
}
function key(terminal: MemoryTerminal, event: KeyEvent): void {
  terminal.dispatch({ type: "key", event });
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
test("Studio filters, recovers from empty search, and opens a result on Enter", async () => {
  await session([80, 24], async (terminal, app) => {
    key(terminal, keyEvent("paste", { text: "does not exist" }));
    await app.flush();
    expect(terminal.screen?.toString()).toContain("No matching issues");
    click(terminal, "Clear search and filters");
    await app.flush();
    expect(terminal.screen?.toString()).toContain("8 issues");
    key(terminal, keyEvent("f", { ctrl: true }));
    key(terminal, keyEvent("paste", { text: "Unicode" }));
    await app.flush();
    expect(terminal.screen?.toString()).toContain("1 issue");
    key(terminal, keyEvent("enter"));
    await app.flush();
    expect(terminal.screen?.toString()).toContain("THE BRIEF");
    expect(terminal.screen?.toString()).toContain("ST-99");
  });
});
test("Studio creates unique issues, edits their brief, and preserves changes across responsive layouts", async () => {
  await session([140, 38], async (terminal, app) => {
    key(terminal, keyEvent("n", { ctrl: true }));
    key(terminal, keyEvent("n", { ctrl: true }));
    await app.flush();
    expect(terminal.screen?.toString()).toContain("ST-106");
    key(terminal, keyEvent("a", { ctrl: true }));
    key(terminal, keyEvent("paste", { text: "Ship a lovely terminal app" }));
    await app.flush();
    expect(terminal.screen?.toString()).toContain("Ship a lovely terminal app");
    key(terminal, keyEvent("tab"));
    key(terminal, keyEvent("tab"));
    key(terminal, keyEvent("tab"));
    key(terminal, keyEvent("paste", { text: "A thoughtful brief." }));
    await app.flush();
    expect(terminal.screen?.toString()).toContain("A thoughtful brief.");
    for (const [width, height] of [
      [70, 20],
      [40, 12],
      [160, 40],
    ] as const) {
      terminal.resize(width, height);
      await app.flush();
      expect(terminal.screen?.toString()).toContain(
        "Ship a lovely terminal app",
      );
    }
    expect(terminal.screen?.toString()).toContain("A thoughtful brief.");
    click(terminal, "− Normal");
    await app.flush();
    expect(terminal.screen?.toString()).toContain("↑ High");
    click(terminal, "Mark complete");
    await app.flush();
    expect(terminal.screen?.toString()).toContain("Reopen issue");
    expect(terminal.screen?.toString()).toContain("3 of 10 complete");
  });
});
test("Studio supports filter changes, keyboard queue navigation, back, and native selection", async () => {
  await session([80, 24], async (terminal, app) => {
    click(terminal, "Done");
    await app.flush();
    expect(terminal.screen?.toString()).toContain("2 issues");
    for (let index = 0; index < 1; index++) key(terminal, keyEvent("tab"));
    key(terminal, keyEvent("down"));
    await app.flush();
    key(terminal, keyEvent("enter"));
    await app.flush();
    expect(terminal.screen?.toString()).toContain("ST-99");
    key(terminal, keyEvent("escape"));
    await app.flush();
    expect(terminal.screen?.toString()).toContain("Release queue");
    key(terminal, keyEvent("f2"));
    await app.flush();
    expect(terminal.mouseTracking).toBe(false);
    key(terminal, keyEvent("f2"));
    await app.flush();
    expect(terminal.mouseTracking).toBe(true);
  });
});
test.each([
  [36, 10],
  [80, 24],
  [110, 28],
  [150, 40],
])("Studio keeps useful content at %sx%s", async (width, height) => {
  await session([width, height], async (terminal, app) => {
    await app.flush();
    const screen = terminal.screen?.toString() ?? "";
    expect(screen).toContain("STUDIO");
    expect(screen).toContain("Search issues");
    expect(screen).toContain("ST-104");
    expect(screen).toContain("quit");
  });
});
