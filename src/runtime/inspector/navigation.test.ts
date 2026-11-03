import { expect, test } from "bun:test";

import type { PointerEvent } from "../../../index";

import {
  column,
  createApp,
  keyEvent,
  MemoryTerminal,
  text,
} from "../../../index";
import { mounted } from "../components/tree";
import { DebugSelection } from "./selection";
import { InspectorTree } from "./tree-view";

function pointer(
  terminal: MemoryTerminal,
  point: { x: number; y: number },
  action: PointerEvent["action"],
  deltaY = 0,
): void {
  terminal.dispatch({
    type: "mouse",
    event: { ...point, action, button: 0, deltaY },
  });
}
function click(terminal: MemoryTerminal, label: string): void {
  label = label.trim();
  const rows = terminal.screen?.toString().split("\n") ?? [];
  const y = rows.findIndex((row) => row.includes(label));
  if (y < 0) throw new Error(`Inspector control missing: ${label}`);
  const x = (rows[y]?.indexOf(label) ?? 0) + 1;
  pointer(terminal, { x, y }, "press");
  pointer(terminal, { x, y }, "release");
}

test("the tree scrolls independently, supports keyboard paging, and exposes styled property tabs", async () => {
  const terminal = new MemoryTerminal(100, 35);
  const rows = Array.from({ length: 100 }, (_, index) =>
    text(`Row ${index}`).key(index),
  );
  const app = createApp(() => column(rows).fill().color("#abcdef").padding(1), {
    terminal,
  });
  const running = app.run();
  try {
    await Bun.sleep(0);
    app.debug.setPicking(true);
    await app.flush();
    pointer(terminal, { x: 1, y: 1 }, "press");
    pointer(terminal, { x: 1, y: 1 }, "release");
    await app.flush();
    for (let index = 0; index < 45; index++)
      pointer(terminal, { x: 5, y: 8 }, "scroll", 1);
    await app.flush();
    expect(terminal.screen?.toString()).toContain('text key=50 "Row 50"');
    expect(app.stats.contentCellsWritten).toBe(0);
    terminal.dispatch({ type: "key", event: keyEvent("end") });
    await Bun.sleep(0);
    await app.flush();
    expect(terminal.screen?.toString()).toContain('text key=99 "Row 99"');
    click(terminal, " Styles ");
    await app.flush();
    expect(terminal.screen?.toString()).toContain("Resolved");
    expect(terminal.screen?.toString()).toContain("foreground");
    expect(terminal.screen?.toString()).toContain('"#abcdef"');
    click(terminal, " Props ");
    await app.flush();
    expect(terminal.screen?.toString()).toContain('"Row 99"');
    click(terminal, " State ");
    await app.flush();
    expect(terminal.screen?.toString()).toContain("Interaction");
    expect(
      terminal.screen?.cells.some(
        (cell) => "▁▂▃▄▅▆▇█".includes(cell.text) && cell.text.length === 1,
      ),
    ).toBe(true);
  } finally {
    app.stop();
    await running;
  }
});

test("header actions stay right aligned and switching placement reflows the application", async () => {
  const terminal = new MemoryTerminal(140, 45);
  const app = createApp(() => text("Body"), { terminal });
  const running = app.run();
  try {
    await Bun.sleep(0);
    app.debug.setPicking(true);
    await app.flush();
    terminal.dispatch({ type: "key", event: keyEvent("escape") });
    await app.flush();
    const header =
      terminal.screen
        ?.toString()
        .split("\n")
        .find((row) => row.includes(" Sidebar ")) ?? "";
    expect(header.indexOf(" Pick ")).toBeGreaterThan(
      header.indexOf(" Elements ") + 30,
    );
    expect(header).toMatch(/ Pick\s+Sidebar\s+x/);
    click(terminal, " Sidebar ");
    await app.flush();
    expect(app.debug.placement).toBe("sidebar");
    expect(app.viewport.width).toBeLessThan(140);
    click(terminal, " Overlay ");
    await app.flush();
    expect(app.viewport.width).toBe(140);
  } finally {
    app.stop();
    await running;
  }
});

test("deep tree indentation remains uncapped and horizontal wheel scrolling reveals full labels", async () => {
  const root = mounted(column(), null);
  let parent = root;
  for (let depth = 0; depth < 35; depth++) {
    const child = mounted(column(), parent);
    parent.children = [child];
    parent = child;
  }
  parent.children = [mounted(text("deeply nested target"), parent)];
  const model = new DebugSelection(() => app.schedule());
  model.refresh(root);
  const terminal = new MemoryTerminal(40, 12);
  const app = createApp(() => InspectorTree({ model, height: 12 }), {
    terminal,
  });
  const running = app.run();
  try {
    await Bun.sleep(0);
    await app.flush();
    for (const delta of [
      { deltaY: 100, deltaX: 0 },
      { deltaY: 0, deltaX: 100 },
    ]) {
      terminal.dispatch({
        type: "mouse",
        event: { action: "scroll", x: 10, y: 4, button: 0, ...delta },
      });
      await app.flush();
      if (!delta.deltaX)
        expect(terminal.screen?.toString()).not.toContain("column");
    }
    expect(terminal.screen?.toString()).toContain(
      'text "deeply nested target"',
    );
    expect(terminal.screen?.toString()).toContain("37 nodes");
  } finally {
    app.stop();
    await running;
  }
});
