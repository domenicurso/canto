import { expect, test } from "bun:test";

import {
  column,
  createApp,
  MemoryTerminal,
  text,
  useState,
} from "../../../index";

function click(terminal: MemoryTerminal, label: string): void {
  const rows = terminal.screen?.toString().split("\n") ?? [];
  const y = rows.findIndex((row) => row.includes(label));
  if (y < 0) throw new Error(`Missing inspector control ${label}`);
  const x = rows[y]?.indexOf(label) ?? 0;
  for (const action of ["press", "release"] as const)
    terminal.dispatch({
      type: "mouse",
      event: { action, x, y, button: 0, deltaY: 0 },
    });
}
test("detail tab, placement and selection survive app rerenders, responsive remounts and reopening", async () => {
  let advance = (): void => {};
  const terminal = new MemoryTerminal(180, 45);
  const app = createApp(
    () => {
      const [count, setCount] = useState(0);
      advance = () => setCount((value) => value + 1);
      return column(text(`Count ${count}`))
        .fill()
        .color("#abcdef");
    },
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    app.debug.setPicking(true);
    await app.flush();
    for (const action of ["press", "release"] as const)
      terminal.dispatch({
        type: "mouse",
        event: { action, x: 0, y: 1, button: 0, deltaY: 0 },
      });
    await app.flush();
    click(terminal, "Styles");
    await app.flush();
    click(terminal, "Sidebar");
    await app.flush();
    expect(app.debug.placement).toBe("sidebar");
    for (const width of [110, 180]) {
      terminal.resize(width, 45);
      advance();
      await app.flush();
      expect(terminal.screen?.toString()).toContain("Resolved");
      expect(terminal.screen?.toString()).toContain('"#abcdef"');
      expect(terminal.screen?.toString()).not.toContain("No selection");
    }
    app.debug.setVisible(false);
    await app.flush();
    app.debug.setVisible(true);
    await app.flush();
    expect(app.debug.placement).toBe("sidebar");
    expect(terminal.screen?.toString()).toContain("Resolved");
    expect(terminal.screen?.toString()).toContain("Anonymous / column");
  } finally {
    app.stop();
    await running;
  }
});
