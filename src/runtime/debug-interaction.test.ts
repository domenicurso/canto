import { expect, test } from "bun:test";

import type { PointerEvent } from "../../index";

import { button, column, createApp, MemoryTerminal, style } from "../../index";

function mouse(terminal: MemoryTerminal, action: PointerEvent["action"]): void {
  terminal.dispatch({
    type: "mouse",
    event: { action, x: 1, y: 1, button: 0, deltaY: 0 },
  });
}
test("isolated hover and press immediately report all 36 changed button cells in the same content frame", async () => {
  const terminal = new MemoryTerminal(80, 24);
  const app = createApp(
    () =>
      column(
        button("Toggle", () => {})
          .width(12)
          .height(3)
          .background("#000")
          .hovered(style().background("#fff"))
          .pressed(style().background("#0f0")),
      ).fill(),
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    app.debug.setVisible(true);
    await app.flush();
    for (const action of ["move", "press", "release"] as const) {
      mouse(terminal, action);
      await app.flush();
      expect(app.stats.fps).toBeLessThan(8);
      expect(app.stats.contentCellsWritten).toBe(36);
      const shown = terminal.screen?.toString();
      expect(shown).toContain(`Content #${app.stats.frame}`);
      expect(shown).toContain(`Output #${app.stats.frame - 1}`);
      expect(shown).toMatch(/Changed\s+36\s*│/);
    }
    expect(terminal.screen?.get(79, 23)?.text).toBe("╯");
    expect(terminal.screen?.get(20, 10)?.text).toBe("╭");
  } finally {
    app.stop();
    await running;
  }
});
