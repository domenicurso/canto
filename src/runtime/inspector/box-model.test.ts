import { expect, test } from "bun:test";

import { createApp, keyEvent, MemoryTerminal } from "../../../index";
import { column } from "../../element/factories";
import { mounted } from "../components/tree";
import { BoxModel } from "./box-model";

function click(terminal: MemoryTerminal, x: number, y: number): void {
  for (const action of ["press", "release"] as const)
    terminal.dispatch({
      type: "mouse",
      event: { x, y, action, button: 0, deltaY: 0 },
    });
}
function key(terminal: MemoryTerminal, value: string): void {
  terminal.dispatch({
    type: "key",
    event: keyEvent(value, { text: value.length === 1 ? value : undefined }),
  });
}
test("box rings align every side, dimensions sit below them and numeric cells open an editor", async () => {
  const node = mounted(column().border("single").padding(2), null);
  node.layout.style = { border: "single", padding: 2 };
  node.layout.rect = { x: 0, y: 0, width: 30, height: 10 };
  node.layout.inner = { x: 3, y: 3, width: 24, height: 4 };
  const terminal = new MemoryTerminal(60, 20);
  const app = createApp(
    () => BoxModel({ node, width: 60, changed: () => {} }),
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    await app.flush();
    const rows = terminal.screen?.toString().split("\n") ?? [];
    expect(rows[0]?.indexOf("1")).toBe(rows[4]?.indexOf("1"));
    expect(rows[1]?.indexOf("2")).toBe(rows[3]?.indexOf("2"));
    expect(rows[2]?.trim()).toBe(
      "1  2                      24 x 4                      2  1",
    );
    expect(rows[5]?.trim()).toBe("30 x 10");
    expect(rows[2]?.indexOf(" x ")).toBe(rows[5]?.indexOf(" x "));
    expect(rows[6]?.trim()).toBe("gap  = row 0  || column 0");
    expect(rows[7]?.trim()).toBe("");
    click(terminal, rows[1]?.indexOf("2") ?? 0, 1);
    await app.flush();
    expect(terminal.screen?.toString()).toContain("paddingTop");
    key(terminal, "3");
    key(terminal, "enter");
    await app.flush();
    expect(node.element.definition.base.paddingTop).toBe(3);
    expect(terminal.screen?.toString()).not.toContain("Cancel");
    click(terminal, rows[1]?.indexOf("2") ?? 0, 1);
    await app.flush();
    expect(terminal.screen?.toString()).toContain("Reset property");
    const screen = terminal.screen?.toString().split("\n") ?? [];
    const y = screen.findIndex((row) => row.includes("Reset property"));
    click(terminal, screen[y]?.indexOf("Reset property") ?? 0, y);
    await app.flush();
    expect(node.element.definition.base.paddingTop).toBeUndefined();
  } finally {
    app.stop();
    await running;
  }
});

test("compact gap controls edit their own axis and dimension separators stay aligned after resizing", async () => {
  const node = mounted(column().gap(2), null);
  node.layout.style = { gap: 2 };
  node.layout.rect = { x: 0, y: 0, width: 100, height: 12 };
  node.layout.inner = { x: 0, y: 0, width: 9, height: 2 };
  const terminal = new MemoryTerminal(61, 20);
  const app = createApp(
    () => BoxModel({ node, width: terminal.width, changed: () => {} }),
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    await app.flush();
    for (const width of [61, 60]) {
      terminal.resize(width, 20);
      await app.flush();
      const rows = terminal.screen?.toString().split("\n") ?? [];
      expect(rows[2]?.indexOf(" x ")).toBe(rows[5]?.indexOf(" x "));
    }
    for (const [axis, value] of [
      ["column", "4"],
      ["row", "5"],
    ] as const) {
      const line = terminal.screen?.toString().split("\n")[6] ?? "";
      click(terminal, line.indexOf(axis) + axis.length + 1, 6);
      await app.flush();
      expect(terminal.screen?.toString()).toContain(
        axis === "column" ? "Column gap" : "Row gap",
      );
      key(terminal, value);
      key(terminal, "enter");
      await app.flush();
    }
    expect(node.element.definition.base.columnGap).toBe(4);
    expect(node.element.definition.base.rowGap).toBe(5);
    expect(node.element.definition.base.gap).toBe(2);
  } finally {
    app.stop();
    await running;
  }
});
