import { expect, test } from "bun:test";

import type { App, Child, PointerEvent } from "../../index";

import {
  column,
  createApp,
  keyEvent,
  MemoryTerminal,
  scroll,
  text,
  textarea,
  useState,
} from "../../index";

async function session(
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
    event: { action, button: 0, deltaY: 0, x, y },
  });
}
test("textarea selection crosses logical lines and copies their original newlines", async () => {
  await session(
    () =>
      textarea({ defaultValue: "first\nsecond\nthird" }).width(12).height(3),
    async (terminal, app) => {
      pointer(terminal, "press", 2, 0);
      pointer(terminal, "release", 3, 2);
      await app.flush();
      terminal.dispatch({ type: "key", event: keyEvent("w", { alt: true }) });
      await Bun.sleep(0);
      expect(terminal.clipboardText).toBe("rst\nsecond\nthi");
      terminal.dispatch({ type: "key", event: keyEvent("!", { text: "!" }) });
      await app.flush();
      expect(terminal.screen?.toString().trim()).toBe("fi!rd");
    },
  );
});
test("hidden scrollbar gutters cannot capture a drag or change the offset", async () => {
  let changes = 0;
  await session(
    () =>
      scroll(text("wide row of content\n".repeat(40)), {
        scrollbar: "hidden",
        gutter: "stable",
        onScroll: () => {
          changes++;
        },
      }).fill(),
    async (terminal, app) => {
      pointer(terminal, "press", 19, 0);
      pointer(terminal, "release", 19, 99);
      await app.flush();
      expect(changes).toBe(0);
      expect(terminal.screen?.toString()).toContain("wide row of content");
    },
  );
});
test("unmounting a captured scrollbar cancels subsequent drag mutations", async () => {
  let changes = 0;
  await session(
    () => {
      const [visible, setVisible] = useState(true);
      return column(
        visible
          ? scroll(text("row\n".repeat(40)), {
              onScroll: () => {
                changes++;
              },
            })
              .width(20)
              .height(5)
          : text("removed"),
      ).onKey((event) => {
        if (event.key === "x") setVisible(false);
      });
    },
    async (terminal, app) => {
      pointer(terminal, "press", 19, 0);
      terminal.dispatch({ type: "key", event: keyEvent("x") });
      await app.flush();
      const before = changes;
      pointer(terminal, "move", 19, 5);
      pointer(terminal, "release", 19, 5);
      await app.flush();
      expect(changes).toBe(before);
      expect(terminal.screen?.toString()).toContain("removed");
    },
  );
});

test("root keyboard handlers receive events before any child takes focus", async () => {
  await session(
    () => {
      const [value, setValue] = useState("before");
      return column(text(value)).onKey((event) => {
        if (event.key === "x") setValue("after");
      });
    },
    async (terminal, app) => {
      terminal.dispatch({ type: "key", event: keyEvent("x") });
      await app.flush();
      expect(terminal.screen?.toString()).toContain("after");
    },
  );
});
