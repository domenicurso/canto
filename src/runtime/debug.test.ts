import { expect, test } from "bun:test";

import type { App, AppOptions, Child } from "../../index";

import {
  column,
  createApp,
  keyEvent,
  MemoryTerminal,
  text,
  useState,
  useViewport,
} from "../../index";

async function inspect(
  view: () => Child,
  check: (terminal: MemoryTerminal, app: App) => Promise<void>,
  options: AppOptions = {},
): Promise<void> {
  const terminal = new MemoryTerminal(80, 24);
  const app = createApp(view, { ...options, terminal });
  const running = app.run();
  try {
    await Bun.sleep(0);
    await check(terminal, app);
  } finally {
    app.stop();
    await running;
  }
}
test.each(["fullscreen", "inline"] as const)(
  "%s apps have a hidden inspector that toggles without changing their viewport or scheduling idle frames",
  async (mode) => {
    await inspect(
      () => {
        const viewport = useViewport();
        return column(
          text(`Viewport ${viewport.width}x${viewport.height}`),
        ).fill();
      },
      async (terminal, app) => {
        const content = terminal.screen?.toString();
        expect(app.debug.visible).toBe(false);
        expect(content).not.toContain(" Debug ");
        terminal.dispatch({ type: "key", event: keyEvent("f3") });
        await app.flush();
        expect(app.debug.visible).toBe(true);
        expect(terminal.screen?.toString()).toContain(" Debug ");
        expect(terminal.screen?.toString()).toContain("Viewport 80x24");
        expect(app.viewport).toEqual({ width: 80, height: 24 });
        expect(app.stats.layoutNodes).toBe(0);
        const frames = terminal.frames.length;
        await Bun.sleep(20);
        expect(terminal.frames).toHaveLength(frames);
        terminal.dispatch({ type: "key", event: keyEvent("escape") });
        await app.flush();
        expect(app.debug.visible).toBe(false);
        expect(terminal.screen?.toString()).toBe(content);
      },
      { mode },
    );
  },
);
test("the inspector samples completed frames while app stats track every submitted content frame", async () => {
  let update = (_count: number): void => {};
  await inspect(
    () => {
      const [count, setCount] = useState(0);
      update = setCount;
      return column(text(`Count: ${count}`)).fill();
    },
    async (terminal, app) => {
      const sampled = app.stats;
      app.debug.toggle();
      await app.flush();
      expect(app.stats.contentCellsWritten).toBe(0);
      expect(app.stats.cellsWritten).toBeGreaterThan(0);
      const previous = app.stats;
      update(1);
      update(2);
      update(3);
      await app.flush();
      const stats = app.stats;
      expect(stats.frame).toBe(previous.frame + 1);
      expect(stats.contentCellsWritten).toBe(1);
      const lines = terminal.screen?.toString().split("\n") ?? [];
      expect(
        lines.find((line) => line.includes(`#${sampled.frame}`)),
      ).toBeDefined();
      for (const [label, value] of [
        ["Content", sampled.contentTime],
        [" View", sampled.updateTime],
        [" Paint", sampled.paintTime],
        [" Diff", sampled.diffTime],
      ] as const)
        expect(lines.find((line) => line.includes(label))).toContain(
          `${value.toFixed(1)} ms`,
        );
      expect(previous.frame).toBe(stats.frame - 1);
    },
  );
});
test("the inspector composites over changing app colors without contaminating retained content", async () => {
  let recolor = (_color: string): void => {};
  await inspect(
    () => {
      const [color, setColor] = useState("#204060");
      recolor = setColor;
      return column(text("Background")).fill().background(color);
    },
    async (terminal, app) => {
      app.debug.setVisible(true);
      await app.flush();
      expect(terminal.screen?.get(34, 12)?.style.background).toEqual([
        17, 28, 48,
      ]);
      recolor("#602040");
      await app.flush();
      expect(terminal.screen?.get(34, 12)?.style.background).toEqual([
        25, 24, 45,
      ]);
      app.debug.setVisible(false);
      await app.flush();
      expect(terminal.screen?.get(34, 12)?.style.background).toBe("#602040");
    },
  );
});
test("debug false leaves F3 available to app handlers", async () => {
  let keys = 0;
  await inspect(
    () =>
      text("Ready").onKey((event) => {
        if (event.key === "f3") keys++;
      }),
    async (terminal, app) => {
      terminal.dispatch({ type: "key", event: keyEvent("f3") });
      await app.flush();
      expect(keys).toBe(1);
      expect(app.debug.visible).toBe(false);
      expect(terminal.screen?.toString()).not.toContain(" Debug ");
    },
    { debug: false },
  );
});
