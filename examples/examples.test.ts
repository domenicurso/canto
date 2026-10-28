import { expect, test } from "bun:test";

import { createApp, keyEvent, MemoryTerminal } from "../index";
import { Canvas } from "./canvas";
import { Form } from "./form";
import { Interactions } from "./interactions";
import { Layout } from "./layout";
import { Logs } from "./logs";
import { Overlays } from "./overlays";
import { Pixels } from "./pixels";
import { Styles } from "./styles";
import { Tasks } from "./tasks";
import { VirtualList } from "./virtual-list";

const examples = [
  { name: "pixels", view: Pixels, label: "Pixel canvas" },
  { name: "overlays", view: Overlays, label: "Unstyled overlay behavior" },
  { name: "canvas", view: Canvas, label: "animated sine wave" },
  { name: "form", view: Form, label: "Create a contact" },
  {
    name: "interactions",
    view: Interactions,
    label: "Pointer and clipboard playground",
  },
  { name: "layout", view: Layout, label: "Layout explorer" },
  { name: "logs", view: Logs, label: "Live event stream" },
  { name: "styles", view: Styles, label: "Fluent styles" },
  { name: "tasks", view: Tasks, label: "Tasks · keyed local state" },
  { name: "virtual-list", view: VirtualList, label: "10,000 projects" },
];
test.each(examples)(
  "$name mounts, resizes, and releases its session",
  async ({ view, label }) => {
    const terminal = new MemoryTerminal(80, 24);
    const app = createApp(view, { terminal });
    const running = app.run();
    try {
      await Bun.sleep(0);
      expect(terminal.screen?.toString()).toContain(label);
      terminal.resize(100, 30);
      await app.flush();
      expect(terminal.screen?.width).toBe(100);
      expect(terminal.screen?.height).toBe(30);
    } finally {
      app.stop();
      await running;
    }
    expect(terminal.stopped).toBe(true);
  },
);
test("the form enables Save after valid input and shows its confirmation", async () => {
  const terminal = new MemoryTerminal(100, 38);
  const app = createApp(Form, { terminal });
  const running = app.run();
  try {
    await Bun.sleep(0);
    terminal.dispatch({
      type: "key",
      event: keyEvent("paste", { text: "Ada" }),
    });
    await app.flush();
    terminal.dispatch({ type: "key", event: keyEvent("tab") });
    terminal.dispatch({
      type: "key",
      event: keyEvent("paste", { text: "ada@example.com" }),
    });
    await app.flush();
    terminal.dispatch({ type: "key", event: keyEvent("tab") });
    terminal.dispatch({ type: "key", event: keyEvent("tab") });
    terminal.dispatch({ type: "key", event: keyEvent("enter") });
    await app.flush();
    expect(terminal.screen?.toString()).toContain("Saved Ada locally");
  } finally {
    app.stop();
    await running;
  }
});
test("task row state follows its key when the example reverses its list", async () => {
  const terminal = new MemoryTerminal(100, 25);
  const app = createApp(Tasks, { terminal });
  const running = app.run();
  try {
    await Bun.sleep(0);
    for (let index = 0; index < 3; index++)
      terminal.dispatch({ type: "key", event: keyEvent("tab") });
    terminal.dispatch({ type: "key", event: keyEvent("enter") });
    await app.flush();
    for (let index = 0; index < 4; index++)
      terminal.dispatch({ type: "key", event: keyEvent("tab") });
    terminal.dispatch({ type: "key", event: keyEvent("enter") });
    await app.flush();
    const screen = terminal.screen?.toString() ?? "";
    expect(screen.indexOf("Reverse the rows")).toBeLessThan(
      screen.indexOf("Try a keyed component"),
    );
    expect(screen).toContain("[✓]  Try a keyed component");
  } finally {
    app.stop();
    await running;
  }
});
test("filtering the virtual list resets its window and shows the matching project", async () => {
  const terminal = new MemoryTerminal(100, 25);
  const app = createApp(VirtualList, { terminal });
  const running = app.run();
  try {
    await Bun.sleep(0);
    terminal.dispatch({
      type: "key",
      event: keyEvent("paste", { text: "10000" }),
    });
    await app.flush();
    expect(terminal.screen?.toString()).toContain("Project 10000");
    expect(terminal.screen?.toString()).toContain("1 results");
  } finally {
    app.stop();
    await running;
  }
});
