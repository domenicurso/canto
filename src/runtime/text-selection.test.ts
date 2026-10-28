import { expect, test } from "bun:test";

import type { App, Child, PointerEvent } from "../../index";

import {
  column,
  createApp,
  keyEvent,
  MemoryTerminal,
  overlay,
  row,
  style,
  text,
  useState,
} from "../../index";

async function session(
  view: () => Child,
  check: (terminal: MemoryTerminal, app: App) => Promise<void>,
) {
  const terminal = new MemoryTerminal(30, 10);
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
test("text selection crosses source elements without painting layout gaps", async () => {
  await session(
    () =>
      column(text("first text").width("fill"), text("second control")).gap(2),
    async (terminal, app) => {
      pointer(terminal, "press", 2, 0);
      pointer(terminal, "release", 9, 3);
      await app.flush();
      await copy(terminal);
      expect(terminal.clipboardText).toBe("rst text\nsecond con");
      expect(terminal.screen?.get(9, 0)?.style.background).toBe("brightWhite");
      for (const [x, y] of [
        [10, 0],
        [29, 0],
        [0, 1],
        [0, 2],
      ] as const)
        expect(terminal.screen?.get(x, y)?.style.background).toBeUndefined();
    },
  );
});
test("wrapped text copies source spaces without inserting visual line breaks and honors selected styles", async () => {
  await session(
    () =>
      text("hello ", text("界 world").color("red"))
        .width(8)
        .selected(style().background("blue").color("white")),
    async (terminal, app) => {
      pointer(terminal, "press", 0, 0);
      pointer(terminal, "release", 20, 1);
      await app.flush();
      await copy(terminal);
      expect(terminal.clipboardText).toBe("hello 界 world");
      expect(terminal.screen?.get(0, 1)?.style.background).toBe("blue");
      expect(terminal.screen?.get(20, 1)?.style.background).toBeUndefined();
    },
  );
});
test("selection does not paint across an overlapping element", async () => {
  await session(
    () =>
      column(
        overlay(
          text("abcdefghij").width(10),
          text("BLOCK").position("absolute").left(3).zIndex(2),
        )
          .width(10)
          .height(1),
      ),
    async (terminal, app) => {
      pointer(terminal, "press", 0, 0);
      pointer(terminal, "release", 9, 0);
      await app.flush();
      expect(terminal.screen?.get(0, 0)?.style.background).toBe("brightWhite");
      expect(terminal.screen?.get(3, 0)?.style.background).toBeUndefined();
    },
  );
});
test("selection follows its text on layout changes and cancels if its source is replaced", async () => {
  let update = (_value: number): void => {};
  await session(
    () => {
      const [version, setVersion] = useState(0);
      update = setVersion;
      return column(
        text("header").height(version + 1),
        row(text(version === 2 ? "replacement" : "select me")),
      );
    },
    async (terminal, app) => {
      pointer(terminal, "press", 0, 1);
      pointer(terminal, "release", 5, 1);
      await app.flush();
      update(1);
      await app.flush();
      expect(terminal.screen?.get(0, 1)?.style.background).toBeUndefined();
      expect(terminal.screen?.get(0, 2)?.style.background).toBe("brightWhite");
      update(2);
      await app.flush();
      expect(terminal.screen?.get(0, 3)?.style.background).toBeUndefined();
    },
  );
});
