import { expect, test } from "bun:test";

import type { App, Child } from "../../index";

import { createApp, keyEvent, MemoryTerminal } from "../../index";
import { AbsolutePosition } from "./absolute-position";
import { Choice } from "./choice";
import { Conditional } from "./conditional";
import { Console } from "./console";
import { Debug } from "./debug";
import { Git } from "./git";
import { Hello } from "./hello";
import { Image } from "./image";
import { Input } from "./input";
import { Prompt } from "./prompt";
import { ScrollTest } from "./scroll-test";
import { Scrollbars } from "./scrollbars";

const examples = [
  { view: Hello, label: "Live Data Feed" },
  { view: Conditional, label: "Conditional Widget Demo" },
  { view: Choice, label: "What is your favorite color" },
  { view: Prompt, label: "What is your name" },
  { view: Input, label: "Input Widget Demo" },
  { view: AbsolutePosition, label: "Absolute positioning demo" },
  { view: Console, label: "Live Data Feed with Console" },
  { view: Debug, label: "Debug Panel Tests" },
  { view: Scrollbars, label: "Scrollable Widget with Scrollbars Demo" },
  { view: ScrollTest, label: "Scroll Test Application" },
  { view: Git, label: "Git Status" },
  { view: Image, label: "PNG rendered with half-block cells" },
];
async function mounted(
  view: () => Child,
  run: (terminal: MemoryTerminal, app: App) => Promise<void>,
) {
  const terminal = new MemoryTerminal(80, 24);
  const app = createApp(view, { terminal });
  const running = app.run();
  try {
    await Bun.sleep(0);
    await run(terminal, app);
  } finally {
    app.stop();
    await running;
  }
  expect(terminal.stopped).toBe(true);
}
async function press(
  terminal: MemoryTerminal,
  app: App,
  key: string,
  text?: string,
) {
  terminal.dispatch({ type: "key", event: keyEvent(key, { text }) });
  await app.flush();
}
test.each(examples)("$label mounts and resizes", async ({ view, label }) => {
  await mounted(view, async (terminal, app) => {
    expect(terminal.screen?.toString()).toContain(label);
    terminal.resize(100, 30);
    await app.flush();
    expect(terminal.screen?.width).toBe(100);
    expect(terminal.screen?.toString()).toContain(label);
  });
});
test("conditional sections toggle, reach thresholds, and reset", async () => {
  await mounted(Conditional, async (terminal, app) => {
    await press(terminal, app, "m");
    expect(terminal.screen?.toString()).not.toContain(
      "This message is conditionally rendered!",
    );
    await press(terminal, app, "c");
    expect(terminal.screen?.toString()).toContain("Option C");
    for (let count = 0; count < 10; count++) await press(terminal, app, " ");
    expect(terminal.screen?.toString()).toContain(
      "Counter reached 10 or more!",
    );
    await press(terminal, app, "r");
    expect(terminal.screen?.toString()).toContain("Counter: 0");
    expect(terminal.screen?.toString()).not.toContain("Option C");
  });
});
test("choices wrap and submit an item beyond the first viewport", async () => {
  await mounted(Choice, async (terminal, app) => {
    await press(terminal, app, "up");
    expect(terminal.screen?.toString()).toContain("→ Black");
    await press(terminal, app, "enter");
    expect(terminal.screen?.toString()).toContain("favorite color: Black");
    expect(terminal.screen?.toString()).not.toContain("↑/↓");
  });
});
test("prompt rejects long input and accepts the default after clearing", async () => {
  await mounted(Prompt, async (terminal, app) => {
    await press(terminal, app, "paste", "x".repeat(21));
    await press(terminal, app, "enter");
    expect(terminal.screen?.toString()).toContain("Maximum length is 20");
    terminal.dispatch({ type: "key", event: keyEvent("a", { ctrl: true }) });
    await press(terminal, app, "backspace");
    await press(terminal, app, "enter");
    expect(terminal.screen?.toString()).toContain("John Doe");
    expect(terminal.screen?.toString()).toContain("Answer accepted");
  });
});
test("editing a controlled field updates its preview", async () => {
  await mounted(Input, async (terminal, app) => {
    terminal.dispatch({ type: "key", event: keyEvent("a", { ctrl: true }) });
    await press(terminal, app, "paste", "Ada Lovelace");
    expect(terminal.screen?.toString()).toContain("Name: Ada Lovelace");
  });
});
test("console commands stay inside the app and debug reads supplied telemetry", async () => {
  await mounted(
    () => Debug(() => "Render 1.25ms · 42 cells"),
    async (terminal, app) => {
      await press(terminal, app, "f3");
      expect(terminal.screen?.toString()).toContain("42 cells");
      await press(terminal, app, "f12");
      await press(terminal, app, "paste", "help");
      await press(terminal, app, "enter");
      expect(terminal.screen?.toString()).toContain(
        "help · clear · status · quit",
      );
      await press(terminal, app, "paste", "clear");
      await press(terminal, app, "enter");
      expect(terminal.screen?.toString()).not.toContain("> help");
      await press(terminal, app, "escape");
      expect(terminal.screen?.toString()).not.toContain("│Console");
    },
  );
});
test("scrollbars move in both axes", async () => {
  await mounted(Scrollbars, async (terminal, app) => {
    await press(terminal, app, "right");
    await press(terminal, app, "down");
    expect(terminal.screen?.toString()).toContain("Scroll: X=1, Y=1");
  });
});
test("scroll console can jump to the bottom and reset", async () => {
  await mounted(ScrollTest, async (terminal, app) => {
    await press(terminal, app, "f12");
    await press(terminal, app, "paste", "bottom");
    await press(terminal, app, "enter");
    expect(terminal.screen?.toString()).toContain("=== END OF CONTENT ===");
    await press(terminal, app, "paste", "reset");
    await press(terminal, app, "enter");
    expect(terminal.screen?.toString()).toContain(
      "=== SCROLLABLE CONTENT TEST ===",
    );
  });
});
test("Git loads the current checkout and refreshes without changing it", async () => {
  await mounted(Git, async (terminal, app) => {
    for (
      let attempt = 0;
      attempt < 100 && terminal.screen?.toString().includes("Loading…");
      attempt++
    ) {
      await Bun.sleep(10);
      await app.flush();
    }
    expect(terminal.screen?.toString()).toMatch(/files:|No changes/);
    await press(terminal, app, "r");
    for (
      let attempt = 0;
      attempt < 100 && terminal.screen?.toString().includes("Loading…");
      attempt++
    ) {
      await Bun.sleep(10);
      await app.flush();
    }
    expect(terminal.screen?.toString()).toMatch(/files:|No changes/);
  });
});
