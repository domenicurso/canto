import { expect, test } from "bun:test";

import {
  column,
  createApp,
  input,
  MemoryTerminal,
  row,
  text,
} from "../../index";

test.each(["inline", "fullscreen"] as const)(
  "%s layout stays inside a tiny viewport and recovers on expansion",
  async (mode) => {
    const terminal = new MemoryTerminal(80, 24);
    const app = createApp(
      () =>
        column(
          text("Header").padding([1, 2]).border("rounded"),
          row(
            text("minimum width").minWidth(20),
            input({ defaultValue: "editable" }).width(20).autoFocus(),
          ),
          text("Footer"),
        ).gap(1),
      { terminal, mode },
    );
    const running = app.run();
    try {
      await Bun.sleep(0);
      for (const [width, height] of [
        [6, 3],
        [1, 1],
        [40, 12],
        [80, 24],
      ] as const) {
        terminal.resize(width, height);
        await app.flush();
        expect(terminal.screen?.width).toBe(width);
        expect(terminal.screen?.height).toBeLessThanOrEqual(height);
        // Out-of-range cleanup cursor moves used to clamp onto the last visible row.
        const moves =
          terminal.output.at(-1)?.matchAll(/\x1b\[(\d+);\d+H/g) ?? [];
        for (const move of moves)
          expect(Number(move[1])).toBeLessThanOrEqual(height);
      }
      expect(terminal.screen?.toString()).toContain("Footer");
      terminal.resize(80, 24);
      await app.flush();
      expect(terminal.output.at(-1)).toContain("Header");
    } finally {
      app.stop();
      await running;
    }
  },
);

test("the layout demo retains pane headings in short terminals and stacks on narrow ones", async () => {
  const { Layout } = await import("../../examples/layout");
  const terminal = new MemoryTerminal(100, 12);
  const app = createApp(Layout, { terminal });
  const running = app.run();
  try {
    await Bun.sleep(0);
    expect(terminal.screen?.toString()).toContain("WORKSPACE");
    expect(terminal.screen?.toString()).toContain("A flexible content pane");
    expect(terminal.screen?.toString()).toContain("Inspector");
    terminal.resize(45, 10);
    await app.flush();
    expect(terminal.screen?.toString()).toContain("WORKSPACE · Overview");
    expect(terminal.screen?.toString()).toContain("A flexible content pane");
    terminal.resize(100, 12);
    await app.flush();
    expect(terminal.screen?.toString()).toContain("Inspector");
  } finally {
    app.stop();
    await running;
  }
});

test("compressed flow preserves header and footer before shrinking long content", async () => {
  const terminal = new MemoryTerminal(20, 4);
  const app = createApp(
    () => column(text("Header"), text("body\n".repeat(10)), text("Footer")),
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    const lines = terminal.screen?.toString().split("\n");
    expect(lines?.[0]).toBe("Header");
    expect(lines?.[3]).toBe("Footer");
  } finally {
    app.stop();
    await running;
  }
});
