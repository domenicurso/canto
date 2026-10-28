import { expect, test } from "bun:test";

import {
  button,
  canvas,
  column,
  createApp,
  input,
  keyEvent,
  MemoryTerminal,
  overlay,
  text,
  useApp,
} from "../../index";

function pointer(
  terminal: MemoryTerminal,
  action: "press" | "release",
  x: number,
  y: number,
): void {
  terminal.dispatch({
    type: "mouse",
    event: { action, x, y, button: 0, deltaY: 0 },
  });
}
test("clicking the inspector does not activate or dismiss app overlays, and the close gesture stays captured", async () => {
  const terminal = new MemoryTerminal(80, 24);
  let presses = 0,
    dismissals = 0,
    releases = 0;
  const app = createApp(
    () =>
      column(
        overlay({
          content: button("Behind", () => {
            presses++;
          }),
          modal: true,
          onDismiss: () => {
            dismissals++;
          },
        }).fill(),
      ).onMouse((event) => {
        if (event.action === "release") releases++;
      }),
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    app.debug.setVisible(true);
    await app.flush();
    pointer(terminal, "press", 40, 15);
    pointer(terminal, "release", 40, 15);
    await app.flush();
    expect(presses).toBe(0);
    expect(dismissals).toBe(0);
    expect(releases).toBe(0);
    pointer(terminal, "press", 77, 10);
    await app.flush();
    expect(app.debug.visible).toBe(false);
    pointer(terminal, "release", 77, 10);
    await app.flush();
    expect(presses).toBe(0);
    expect(dismissals).toBe(0);
    expect(releases).toBe(0);
  } finally {
    app.stop();
    await running;
  }
});
test("the inspector hides an occluded editor caret and restores focus and editing after closing", async () => {
  const terminal = new MemoryTerminal(80, 24);
  const app = createApp(
    () =>
      column(
        input({ defaultValue: "edit" })
          .position("absolute")
          .left(40)
          .top(15)
          .width(10)
          .autoFocus(),
      ).fill(),
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    expect(terminal.output.at(-1)).toEndWith("\x1b[?25h");
    app.debug.setVisible(true);
    await app.flush();
    expect(terminal.output.at(-1)).toEndWith("\x1b[?25l");
    terminal.dispatch({ type: "key", event: keyEvent("escape") });
    await app.flush();
    expect(terminal.output.at(-1)).toEndWith("\x1b[?25h");
    terminal.dispatch({ type: "key", event: keyEvent("X", { text: "X" }) });
    await app.flush();
    expect(terminal.screen?.toString()).toContain("Xedit");
  } finally {
    app.stop();
    await running;
  }
});
test("native images retain pixel detail beneath the translucent inspector without changing layout", async () => {
  const terminal = new MemoryTerminal(80, 24);
  terminal.graphics.kitty = true;
  const app = createApp(
    () =>
      canvas(
        { width: 1, height: 1, data: new Uint8Array([255, 0, 0, 255]) },
        { fit: "fill" },
      ).fill(),
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    expect(terminal.screen?.rasters).toHaveLength(1);
    app.debug.toggle();
    await app.flush();
    expect(terminal.screen?.rasters.length).toBeGreaterThan(0);
    const tinted = terminal.screen?.rasters.find(
      (image) =>
        image.rect.x <= 34 &&
        image.rect.x + image.rect.width > 34 &&
        image.rect.y <= 12 &&
        image.rect.y + image.rect.height > 12,
    );
    expect(Array.from(tinted?.buffer.data.slice(0, 4) ?? [])).toEqual([
      44, 20, 37, 255,
    ]);
    app.debug.toggle();
    await app.flush();
    expect(terminal.screen?.rasters).toHaveLength(1);
    expect(app.stats.layoutNodes).toBe(0);
  } finally {
    app.stop();
    await running;
  }
});
test("the floating inspector remains clipped through tiny viewports and can be controlled through useApp", async () => {
  const terminal = new MemoryTerminal(80, 24);
  const app = createApp(
    () => {
      const app = useApp();
      return text("Ready").onKey((event) => {
        if (event.key === "d") app.debug.toggle();
      });
    },
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    terminal.dispatch({ type: "key", event: keyEvent("d") });
    await app.flush();
    for (const [width, height] of [
      [1, 1],
      [6, 3],
      [40, 12],
      [80, 24],
    ] as const) {
      terminal.resize(width, height);
      await app.flush();
      expect(terminal.screen?.cells).toHaveLength(width * height);
      expect(terminal.screen?.width).toBe(width);
      if (width > 1 && height > 1)
        expect(terminal.screen?.get(width - 1, height - 1)?.text).toBe("╯");
    }
    expect(terminal.screen?.toString()).toContain(" Debug ");
  } finally {
    app.stop();
    await running;
  }
});
