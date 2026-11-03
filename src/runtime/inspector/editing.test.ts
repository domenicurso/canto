import { expect, test } from "bun:test";

import type { PointerEvent } from "../../../index";

import {
  column,
  createApp,
  keyEvent,
  MemoryTerminal,
  text,
} from "../../../index";

function mouse(
  terminal: MemoryTerminal,
  x: number,
  y: number,
  action: PointerEvent["action"],
): void {
  terminal.dispatch({
    type: "mouse",
    event: { x, y, action, button: 0, deltaY: action === "scroll" ? 1 : 0 },
  });
}
function click(terminal: MemoryTerminal, label: string, offset = 0): void {
  const rows = terminal.screen?.toString().split("\n") ?? [];
  const y = rows.findIndex((row) => row.includes(label));
  if (y < 0) throw new Error(`Missing ${label}`);
  const x = (rows[y]?.indexOf(label) ?? 0) + offset;
  mouse(terminal, x, y, "press");
  mouse(terminal, x, y, "release");
}
function key(terminal: MemoryTerminal, value: string, modifiers = {}): void {
  terminal.dispatch({
    type: "key",
    event: keyEvent(value, {
      text: value.length === 1 ? value : undefined,
      ...modifiers,
    }),
  });
}

test("properties move with wheel and keyboard scrolling, and breadcrumbs select ancestors", async () => {
  const terminal = new MemoryTerminal(100, 22);
  const app = createApp(() => column(text("Child")).fill().padding(1), {
    terminal,
  });
  const running = app.run();
  try {
    app.debug.setPicking(true);
    await Bun.sleep(0);
    await app.flush();
    mouse(terminal, 0, 0, "press");
    mouse(terminal, 0, 0, "release");
    await Bun.sleep(0);
    await app.flush();
    expect(terminal.screen?.toString()).toContain("padding");
    for (let i = 0; i < 15; i++) mouse(terminal, 80, 15, "scroll");
    await Bun.sleep(0);
    await app.flush();
    expect(terminal.screen?.toString()).not.toContain("Geometry");
    expect(terminal.screen?.toString()).toContain("Constraints");
    mouse(terminal, 80, 15, "press");
    mouse(terminal, 80, 15, "release");
    key(terminal, "home");
    await Bun.sleep(0);
    await app.flush();
    expect(terminal.screen?.toString()).toContain("Geometry");
    click(terminal, "Anonymous / column");
    await Bun.sleep(0);
    await app.flush();
    expect(terminal.screen?.toString()).toContain("Anonymous");
    expect(terminal.screen?.toString()).not.toContain("Anonymous / column");
  } finally {
    app.stop();
    await running;
  }
});

test("style edits validate input, survive app frames, reset, and allow cancellation", async () => {
  const terminal = new MemoryTerminal(100, 35);
  const app = createApp(
    () => column(text("Child")).fill().padding(1).color("#abcdef"),
    { terminal },
  );
  const running = app.run();
  try {
    app.debug.setPicking(true);
    await Bun.sleep(0);
    await app.flush();
    mouse(terminal, 0, 0, "press");
    mouse(terminal, 0, 0, "release");
    await Bun.sleep(0);
    await app.flush();
    click(terminal, "Styles");
    await Bun.sleep(0);
    await app.flush();
    click(terminal, '"#abcdef"', 2);
    await Bun.sleep(0);
    await app.flush();
    key(terminal, "a", { ctrl: true });
    for (const character of '"#123456"') key(terminal, character);
    key(terminal, "enter");
    await Bun.sleep(0);
    await app.flush();
    expect(terminal.screen?.toString()).toContain('"#123456"');
    expect(terminal.screen?.toString()).toContain("Reset");
    click(terminal, '"#123456"', 2);
    await Bun.sleep(0);
    await app.flush();
    key(terminal, "a", { ctrl: true });
    key(terminal, "!");
    key(terminal, "enter");
    await Bun.sleep(0);
    await app.flush();
    expect(terminal.screen?.toString()).toContain("JSON");
    key(terminal, "escape");
    await Bun.sleep(0);
    await app.flush();
    expect(app.debug.visible).toBe(true);
    click(terminal, "Reset");
    await Bun.sleep(0);
    await app.flush();
    expect(terminal.screen?.toString()).toContain('"#abcdef"');
  } finally {
    app.stop();
    await running;
  }
});
