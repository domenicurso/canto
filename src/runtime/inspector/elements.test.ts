import { expect, test } from "bun:test";

import type { App, Child, PointerEvent } from "../../../index";

import {
  button,
  column,
  createApp,
  input,
  keyEvent,
  MemoryTerminal,
  overlay,
  text,
  useState,
} from "../../../index";

async function inspect(
  view: () => Child,
  check: (terminal: MemoryTerminal, app: App) => Promise<void>,
): Promise<void> {
  const terminal = new MemoryTerminal(100, 35);
  const app = createApp(view, { terminal });
  const running = app.run();
  try {
    await Bun.sleep(0);
    app.debug.setPicking(true);
    await app.flush();
    await check(terminal, app);
  } finally {
    app.stop();
    await running;
  }
}

function mouse(
  terminal: MemoryTerminal,
  x: number,
  y: number,
  action: PointerEvent["action"] = "move",
): void {
  terminal.dispatch({
    type: "mouse",
    event: { action, x, y, button: 0, deltaY: 0 },
  });
}

test("picking shows box geometry and colors without modifying layout or retained content", async () => {
  await inspect(
    () =>
      column(text("First"), text("Second"))
        .width(20)
        .height(10)
        .padding(1)
        .border("single")
        .gap(1)
        .background("#000000"),
    async (terminal, app) => {
      mouse(terminal, 0, 8);
      await app.flush();
      const screen = terminal.screen;
      expect(screen?.toString()).toContain("Box 20×10 at 0,0");
      expect(screen?.toString()).toContain("Padding 1 1 1 1 · border 1 1 1 1");
      expect(screen?.get(0, 0)?.style.background).toEqual([88, 71, 7]);
      expect(screen?.get(1, 1)?.style.background).toEqual([26, 78, 45]);
      expect(screen?.get(2, 2)?.style.background).toEqual([20, 66, 87]);
      expect(screen?.get(2, 3)?.style.background).toEqual([88, 51, 21]);
      expect(screen?.get(2, 2)?.text).toBe("F");
      expect(app.stats.layoutNodes).toBe(0);
      expect(app.stats.contentCellsWritten).toBe(0);
      app.debug.setVisible(false);
      await app.flush();
      expect(terminal.screen?.get(0, 0)?.style.background).toBe("#000000");
      expect(terminal.screen?.get(2, 3)?.style.background).toBe("#000000");
    },
  );
});

test("click pins a target without activating it; the tree navigates parents and retains application focus", async () => {
  let presses = 0;
  await inspect(
    () =>
      column(
        button("Action", () => {
          presses++;
        })
          .width(20)
          .height(3),
        input({ defaultValue: "Draft" }).autoFocus(),
      ).fill(),
    async (terminal, app) => {
      mouse(terminal, 0, 1, "press");
      mouse(terminal, 0, 1, "release");
      await app.flush();
      expect(app.debug.picking).toBe(false);
      expect(presses).toBe(0);
      expect(terminal.screen?.toString()).toContain(
        "component / column / button",
      );
      expect(terminal.screen?.toString()).toContain("Geometry");
      terminal.dispatch({ type: "key", event: keyEvent("left") });
      terminal.dispatch({ type: "key", event: keyEvent("left") });
      await app.flush();
      expect(terminal.screen?.toString()).toContain("component / column");
      app.debug.setVisible(false);
      terminal.dispatch({ type: "key", event: keyEvent("X", { text: "X" }) });
      await app.flush();
      expect(terminal.screen?.toString()).toContain("DraftX");
    },
  );
});

test("picking follows clipping and topmost viewport overlays, and survives tiny resizes", async () => {
  await inspect(
    () =>
      column(
        column(text("Clipped").width(30)).width(5).height(1),
        overlay({ content: text("Top layer") })
          .left(10)
          .top(2)
          .width(12)
          .height(2),
      ).fill(),
    async (terminal, app) => {
      mouse(terminal, 44, 16);
      await app.flush();
      expect(terminal.screen?.toString()).toContain('text "Top layer"');
      mouse(terminal, 8, 0);
      await app.flush();
      expect(terminal.screen?.toString()).not.toContain('text "Clipped"');
      for (const [width, height] of [
        [1, 1],
        [4, 2],
        [100, 35],
      ] as const) {
        terminal.resize(width, height);
        mouse(terminal, 0, 0);
        await app.flush();
        expect(terminal.screen?.cells).toHaveLength(width * height);
      }
    },
  );
});

test("removed pinned targets stop highlighting and the picker shortcut can be released to the application", async () => {
  let remove = (): void => {};
  await inspect(
    () => {
      const [shown, setShown] = useState(true);
      remove = () => setShown(false);
      return column(shown && text("Temporary")).fill();
    },
    async (terminal, app) => {
      mouse(terminal, 0, 0, "press");
      mouse(terminal, 0, 0, "release");
      await app.flush();
      remove();
      await app.flush();
      expect(terminal.screen?.toString()).not.toContain("Temporary");
      expect(terminal.screen?.toString()).toContain("No selection");
      terminal.dispatch({
        type: "key",
        event: keyEvent("i", { ctrl: true, shift: true }),
      });
      expect(app.debug.picking).toBe(true);
      terminal.dispatch({ type: "key", event: keyEvent("escape") });
      expect(app.debug.picking).toBe(false);
      expect(app.debug.visible).toBe(true);
    },
  );
});
