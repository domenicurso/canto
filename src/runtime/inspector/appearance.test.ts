import { expect, test } from "bun:test";

import { column, createApp, MemoryTerminal, text } from "../../../index";
import { debugColors } from "./controls";

function thumbs(terminal: MemoryTerminal): number {
  return (
    terminal.screen?.cells.filter(
      (cell) =>
        cell.style.foreground === debugColors.muted &&
        /^[▁▂▃▄▅▆▇█]$/.test(cell.text),
    ).length ?? 0
  );
}

test("tree syntax colors separate names and strings, and scrollbar thumbs appear only on hover", async () => {
  const terminal = new MemoryTerminal(100, 22);
  const app = createApp(
    () =>
      column(Array.from({ length: 40 }, (_, index) => text(`Child ${index}`))),
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    app.debug.setPicking(true);
    await app.flush();
    app.debug.setPicking(false);
    await Bun.sleep(0);
    await app.flush();
    expect(
      terminal.screen?.cells.some(
        (cell) =>
          cell.text === "t" && cell.style.foreground === debugColors.name,
      ),
    ).toBe(true);
    expect(
      terminal.screen?.cells.some(
        (cell) =>
          cell.text === "C" && cell.style.foreground === debugColors.string,
      ),
    ).toBe(true);
    expect(thumbs(terminal)).toBe(0);
    terminal.dispatch({
      type: "mouse",
      event: { action: "move", x: 10, y: 6, button: 0, deltaY: 0 },
    });
    await Bun.sleep(0);
    await app.flush();
    expect(thumbs(terminal)).toBeGreaterThan(0);
    terminal.dispatch({
      type: "mouse",
      event: { action: "move", x: -1, y: 6, button: 0, deltaY: 0 },
    });
    await Bun.sleep(0);
    await app.flush();
    expect(thumbs(terminal)).toBe(0);
  } finally {
    app.stop();
    await running;
  }
});
