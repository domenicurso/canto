import { expect, test } from "bun:test";

import { createApp, MemoryTerminal, text } from "../../index";

test("native mode disables app mouse handling and restores text mode at runtime", async () => {
  const terminal = new MemoryTerminal(20, 4);
  let presses = 0;
  const app = createApp(
    () =>
      text("select me").onMouse(() => {
        presses++;
      }),
    { terminal, selection: "native" },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    expect(terminal.mouseTracking).toBe(false);
    const press = () =>
      terminal.dispatch({
        type: "mouse",
        event: { action: "press", button: 0, x: 0, y: 0, deltaY: 0 },
      });
    press();
    expect(presses).toBe(0);
    await app.selection.setMode("text");
    expect(terminal.mouseTracking).toBe(true);
    press();
    expect(presses).toBe(1);
    await Promise.all([
      app.selection.setMode("native"),
      app.selection.setMode("text"),
      app.selection.setMode("native"),
    ]);
    expect(app.selection.mode).toBe("native");
    expect(terminal.mouseTracking).toBe(false);
  } finally {
    app.stop();
    await running;
  }
});
test("selection mode can be chosen before startup and tracking failures preserve the prior mode", async () => {
  const terminal = new MemoryTerminal();
  const app = createApp(() => text("ready"), { terminal });
  await app.selection.setMode("native");
  const running = app.run();
  try {
    await Bun.sleep(0);
    expect(terminal.mouseTracking).toBe(false);
    terminal.setMouseTracking = async () => {
      throw new Error("tracking failed");
    };
    await expect(app.selection.setMode("text")).rejects.toThrow(
      "tracking failed",
    );
    expect(app.selection.mode).toBe("native");
  } finally {
    app.stop();
    await running;
  }
});
