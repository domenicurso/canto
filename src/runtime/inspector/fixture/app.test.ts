import { expect, test } from "bun:test";

import type { PointerEvent } from "../../../element/events";

import { keyEvent } from "../../../terminal/input/events";
import { MemoryTerminal } from "../../../terminal/transport";
import { createApp } from "../../app";
import { InspectorFixture } from "./app";

function mouse(
  terminal: MemoryTerminal,
  point: { x: number; y: number },
  action: PointerEvent["action"],
): void {
  terminal.dispatch({
    type: "mouse",
    event: { ...point, action, button: 0, deltaY: 0 },
  });
}
function locate(terminal: MemoryTerminal, label: string) {
  const rows = terminal.screen?.toString().split("\n") ?? [];
  const y = rows.findIndex((row) => row.includes(label));
  if (y < 0) throw new Error(`Missing fixture control: ${label}`);
  return { x: (rows[y]?.indexOf(label) ?? 0) + 1, y };
}
function click(terminal: MemoryTerminal, label: string): void {
  const point = locate(terminal, label);
  mouse(terminal, point, "press");
  mouse(terminal, point, "release");
}
async function settle(app: ReturnType<typeof createApp>): Promise<void> {
  await Bun.sleep(0);
  await app.flush();
}

test("the production inspector view can itself be picked and inspected without recursion", async () => {
  const terminal = new MemoryTerminal(120, 40);
  const app = createApp(InspectorFixture, { terminal });
  const running = app.run();
  try {
    await settle(app);
    expect(terminal.screen?.toString()).toContain("FixtureCard / column");
    expect(terminal.screen?.toString()).toContain("Geometry");
    const point = locate(terminal, "Layout  Styles");
    app.debug.setPicking(true);
    await settle(app);
    mouse(terminal, point, "press");
    mouse(terminal, point, "release");
    await settle(app);
    click(terminal, " Props ");
    await settle(app);
    expect(terminal.screen?.toString()).toContain('"Layout"');
    expect(app.stats.frame).toBeLessThan(30);
    terminal.dispatch({ type: "key", event: keyEvent("f3") });
    await settle(app);
    expect(app.debug.visible).toBe(false);
    expect(terminal.screen?.toString()).toContain("FixtureCard / column");
  } finally {
    app.stop();
    await running;
  }
});

test("fixture cases, reset, placement, close, and reopening exercise the same inspector controls", async () => {
  const terminal = new MemoryTerminal(120, 40);
  const app = createApp(InspectorFixture, { terminal });
  const running = app.run();
  try {
    await settle(app);
    click(terminal, "Long tree");
    await settle(app);
    expect(terminal.screen?.toString()).toMatch(/6\d\d nodes/);
    click(terminal, "Empty");
    await settle(app);
    expect(terminal.screen?.toString()).toContain("No selection");
    click(terminal, "Values");
    await settle(app);
    click(terminal, " Props ");
    await settle(app);
    expect(terminal.screen?.toString()).toContain("A long value");
    click(terminal, "Sidebar");
    await settle(app);
    expect(terminal.screen?.toString()).toContain("Overlay");
    click(terminal, " x");
    await settle(app);
    expect(terminal.screen?.toString()).toContain("Open");
    click(terminal, "Open");
    await settle(app);
    expect(terminal.screen?.toString()).toContain("Props");
    click(terminal, "Reset");
    await settle(app);
    expect(terminal.screen?.toString()).toContain("Props");
  } finally {
    app.stop();
    await running;
  }
});

test("preview picking captures sample controls and survives resizing and app rerenders", async () => {
  const terminal = new MemoryTerminal(120, 40);
  const app = createApp(InspectorFixture, { terminal });
  const running = app.run();
  try {
    await settle(app);
    click(terminal, " Pick ");
    await settle(app);
    mouse(terminal, { x: 4, y: 8 }, "move");
    await settle(app);
    expect(terminal.screen?.toString()).toContain("Box ");
    mouse(terminal, { x: 4, y: 8 }, "press");
    mouse(terminal, { x: 4, y: 8 }, "release");
    await settle(app);
    expect(terminal.screen?.toString()).toContain("button / text");
    terminal.resize(60, 24);
    await settle(app);
    expect(terminal.screen?.width).toBe(60);
    expect(terminal.screen?.toString()).toContain("Layout");
    app.schedule();
    await settle(app);
    expect(app.status).toBe("running");
    expect(terminal.screen?.toString()).toContain("FixtureCard");
  } finally {
    app.stop();
    await running;
  }
  expect(terminal.stopped).toBe(true);
});
