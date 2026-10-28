import { expect, test } from "bun:test";

import type { App, Child } from "../../index";

import { canvas, createApp, MemoryTerminal, text } from "../../index";

async function inspect(
  view: () => Child,
  check: (terminal: MemoryTerminal, app: App) => Promise<void>,
): Promise<void> {
  const terminal = new MemoryTerminal(80, 24);
  terminal.graphics.kitty = true;
  const app = createApp(view, { terminal });
  const running = app.run();
  try {
    await Bun.sleep(0);
    app.debug.setVisible(true);
    await app.flush();
    await check(terminal, app);
  } finally {
    app.stop();
    await running;
  }
}
function move(terminal: MemoryTerminal, x: number, y: number): void {
  terminal.dispatch({
    type: "mouse",
    event: { action: "move", x, y, button: 0, deltaY: 0 },
  });
}
test("every metric label shows its brief help in one borderless row with horizontal padding", async () => {
  await inspect(
    () => text("Body"),
    async (terminal, app) => {
      for (const [x, y, help] of [
        [22, 11, "Frames presented in the last second."],
        [22, 14, "Content work before inspector and output."],
        [23, 15, "Reconcile components and refresh input state."],
        [23, 16, "Resolve styles and position content."],
        [23, 17, "Paint cells and prepare native images."],
        [23, 18, "Compare content cells with the previous frame."],
        [22, 20, "Nodes laid out in this content frame."],
        [22, 21, "Cell area repainted, including unchanged cells."],
        [22, 22, "Content cell writes, excluding the inspector."],
        [51, 14, "Time from reconciliation through output."],
        [52, 15, "Compose the inspector and diff the final screen."],
        [52, 16, "Encode graphics and terminal output."],
        [52, 17, "Complete presentation through this adapter."],
        [51, 18, "Time between completed frames, including idle."],
        [51, 19, "Bytes sent for this frame, including graphics."],
      ] as const) {
        move(terminal, x, y);
        await app.flush();
        const cells =
          terminal.screen?.cells.filter(
            (cell) => cell.style.background === "#334155",
          ) ?? [];
        expect(cells.map((cell) => cell.text).join("")).toBe(` ${help} `);
        const rows = terminal.screen?.cells.flatMap((cell, i) =>
          cell.style.background === "#334155"
            ? [Math.floor(i / terminal.width)]
            : [],
        );
        expect(new Set(rows).size).toBe(1);
        expect(app.stats.contentCellsWritten).toBe(0);
      }
    },
  );
});
test("only labels trigger help and pointer motion within one label does not schedule more frames", async () => {
  await inspect(
    () => text("Body"),
    async (terminal, app) => {
      move(terminal, 23, 16);
      await Bun.sleep(0);
      expect(terminal.screen?.toString()).toContain(
        "Resolve styles and position content.",
      );
      const frames = terminal.frames.length;
      for (let x = 24; x < 35; x++) {
        move(terminal, x, 16);
        await Bun.sleep(0);
      }
      expect(terminal.frames).toHaveLength(frames);
      for (const [x, y] of [
        [22, 16],
        [40, 16],
        [47, 16],
        [2, 2],
      ] as const) {
        move(terminal, x, y);
        await app.flush();
        expect(
          terminal.screen?.cells.some(
            (cell) => cell.style.background === "#334155",
          ),
        ).toBe(false);
      }
      move(terminal, 22, 14);
      await app.flush();
      app.debug.toggle();
      await app.flush();
      app.debug.toggle();
      await app.flush();
      expect(
        terminal.screen?.cells.some(
          (cell) => cell.style.background === "#334155",
        ),
      ).toBe(false);
    },
  );
});
test("tooltips stay clipped on narrow viewports and native images remain sharp around the help row", async () => {
  await inspect(
    () =>
      canvas(
        { width: 1, height: 1, data: new Uint8Array([255, 0, 0, 255]) },
        { fit: "fill" },
      ).fill(),
    async (terminal, app) => {
      move(terminal, 52, 15);
      await app.flush();
      const screen = terminal.screen;
      expect(screen?.rasters.length).toBeGreaterThan(0);
      screen?.cells.forEach((cell, i) => {
        if (cell.style.background !== "#334155") return;
        const x = i % terminal.width,
          y = Math.floor(i / terminal.width);
        expect(
          screen.rasters.some(
            (image) =>
              x >= image.rect.x &&
              x < image.rect.x + image.rect.width &&
              y >= image.rect.y &&
              y < image.rect.y + image.rect.height,
          ),
        ).toBe(false);
      });
      terminal.resize(30, 14);
      await app.flush();
      move(terminal, 3, 6);
      await app.flush();
      const cells =
        terminal.screen?.cells.filter(
          (cell) => cell.style.background === "#334155",
        ) ?? [];
      expect(cells).toHaveLength(30);
      expect(cells[0]?.text).toBe(" ");
      expect(cells.at(-1)?.text).toBe(" ");
      expect(terminal.screen?.cells).toHaveLength(30 * 14);
    },
  );
});
