import { expect, test } from "bun:test";

import type { App, Child, PointerEvent } from "../../index";

import {
  button,
  column,
  createApp,
  input,
  keyEvent,
  MemoryTerminal,
  scroll,
  text,
  useState,
} from "../../index";

async function mounted(
  view: () => Child,
  check: (terminal: MemoryTerminal, app: App) => Promise<void>,
) {
  const terminal = new MemoryTerminal(20, 6);
  const app = createApp(view, { terminal });
  const running = app.run();
  try {
    await Bun.sleep(0);
    await check(terminal, app);
  } finally {
    app.stop();
    await running;
  }
}
function pointer(
  terminal: MemoryTerminal,
  action: PointerEvent["action"],
  x: number,
  y: number,
) {
  terminal.dispatch({
    type: "mouse",
    event: { action, x, y, button: 0, deltaY: 0 },
  });
}
async function copy(terminal: MemoryTerminal) {
  terminal.dispatch({ type: "key", event: keyEvent("w", { alt: true }) });
  await Bun.sleep(0);
}
test("plain text dragging selects across rows in either direction and copies complete wide graphemes", async () => {
  await mounted(
    () => text("hello 界!\nsecond line"),
    async (terminal, app) => {
      pointer(terminal, "press", 7, 0);
      pointer(terminal, "move", 2, 1);
      pointer(terminal, "release", 2, 1);
      await app.flush();
      await copy(terminal);
      expect(terminal.clipboardText).toBe("界!\nsec");
      expect(terminal.screen?.get(6, 0)?.style.background).toBe("brightWhite");
      expect(terminal.screen?.get(7, 0)?.style.background).toBe("brightWhite");
      pointer(terminal, "press", 2, 1);
      pointer(terminal, "release", 7, 0);
      await app.flush();
      await copy(terminal);
      expect(terminal.clipboardText).toBe("界!\nsec");
      terminal.resize(10, 6);
      await app.flush();
      expect(terminal.screen?.get(6, 0)?.style.background).toBeUndefined();
    },
  );
});
test("editor drag capture selects graphemes outside the field, replaces selection, and ignores placeholders", async () => {
  await mounted(
    () => input({ defaultValue: "a界ébc" }).width(12),
    async (terminal, app) => {
      pointer(terminal, "press", 1, 0);
      pointer(terminal, "move", 5, 0);
      pointer(terminal, "release", 5, 0);
      await app.flush();
      await copy(terminal);
      expect(terminal.clipboardText).toBe("界éb");
      terminal.dispatch({ type: "key", event: keyEvent("Q", { text: "Q" }) });
      await app.flush();
      expect(terminal.screen?.toString().split("\n")[0]).toBe("aQc");
      pointer(terminal, "press", 1, 0);
      pointer(terminal, "release", 99, 0);
      await app.flush();
      await copy(terminal);
      expect(terminal.clipboardText).toBe("Qc");
    },
  );
  await mounted(
    () => input({ placeholder: "type here" }),
    async (terminal, app) => {
      pointer(terminal, "press", 4, 0);
      pointer(terminal, "release", 8, 0);
      terminal.dispatch({ type: "key", event: keyEvent("a", { text: "a" }) });
      await app.flush();
      expect(terminal.screen?.toString().split("\n")[0]).toBe("a");
    },
  );
});
test("scrollbar thumb capture clamps both axes, track clicks jump", async () => {
  await mounted(
    () => {
      const [offset, setOffset] = useState({ x: 0, y: 0 });
      return scroll(
        text(
          Array.from({ length: 40 }, (_, y) => `${y}:` + "x".repeat(80)).join(
            "\n",
          ),
        ),
        {
          axis: "both",
          offset,
          onScroll: setOffset,
        },
      ).fill();
    },
    async (terminal, app) => {
      pointer(terminal, "press", 19, 0);
      pointer(terminal, "move", 25, 99);
      pointer(terminal, "release", 25, 99);
      await app.flush();
      expect(terminal.screen?.toString()).toContain("39:");
      pointer(terminal, "press", 19, 0);
      pointer(terminal, "release", 19, -20);
      await app.flush();
      expect(terminal.screen?.toString()).toContain("0:");
      pointer(terminal, "press", 0, 5);
      pointer(terminal, "release", 99, 5);
      await app.flush();
      expect(terminal.screen?.toString()).not.toContain("0:");
    },
  );
});
test("clicking and releasing a button still activates once and never starts selection", async () => {
  let presses = 0;
  await mounted(
    () =>
      column(
        button("Go", () => {
          presses++;
        }),
        text("body"),
      ),
    async (terminal, app) => {
      pointer(terminal, "press", 0, 0);
      pointer(terminal, "release", 0, 0);
      await app.flush();
      expect(presses).toBe(1);
      expect(terminal.screen?.get(0, 0)?.style.background).toBeUndefined();
    },
  );
});
