import { expect, test } from "bun:test";

import type { App, Child, ElementRef, PointerEvent } from "../../index";

import {
  button,
  column,
  createApp,
  input,
  keyEvent,
  MemoryTerminal,
  row,
  scroll,
  style,
  text,
  useState,
} from "../../index";

async function session(
  view: () => Child,
  check: (terminal: MemoryTerminal, app: App) => Promise<void>,
): Promise<void> {
  const terminal = new MemoryTerminal(20, 8);
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
): void {
  terminal.dispatch({
    type: "mouse",
    event: { action, x, y, button: 0, deltaY: 0 },
  });
}
test("nested translations move painting, hit targets, refs, and focus bounds without moving siblings", async () => {
  let presses = 0;
  let translated: ElementRef | null = null;
  let sibling: ElementRef | null = null;
  await session(
    () =>
      column(
        row(boxButton()).width(12).translate(2, 1).height(2),
        text("after").ref((ref) => {
          sibling = ref;
        }),
      ),
    async (terminal, app) => {
      expect(translated?.rect).toMatchObject({ x: 5, y: 1 });
      expect(sibling?.rect.y).toBe(2);
      pointer(terminal, "press", 0, 0);
      pointer(terminal, "release", 0, 0);
      await app.flush();
      expect(presses).toBe(0);
      pointer(terminal, "press", 5, 1);
      pointer(terminal, "release", 5, 1);
      await app.flush();
      expect(presses).toBe(1);
      expect(terminal.screen?.get(5, 1)?.style.bold).toBe(true);
    },
  );
  function boxButton() {
    return button("Go", () => {
      presses++;
    })
      .translate(3, 0)
      .ref((ref) => {
        translated = ref;
      })
      .focused(style().bold());
  }
});
test("aligned translated plain text selects and copies the original wide graphemes", async () => {
  await session(
    () =>
      column(
        text("界ab").width(10).textAlign("right").translate(2, 1).selectable(),
      ).fill(),
    async (terminal, app) => {
      expect(terminal.screen?.get(8, 1)?.text).toBe("界");
      pointer(terminal, "press", 8, 1);
      pointer(terminal, "release", 10, 1);
      await app.flush();
      terminal.dispatch({ type: "key", event: keyEvent("w", { alt: true }) });
      await app.flush();
      expect(terminal.clipboardText).toBe("界a");
      expect(terminal.screen?.get(8, 1)?.style.background).toBe("brightWhite");
    },
  );
});
test("aligned translated editors keep pointer selection and terminal cursor at the rendered glyphs", async () => {
  await session(
    () =>
      column(
        input({ defaultValue: "abcd" })
          .width(10)
          .textAlign("right")
          .translate(2, 1)
          .autoFocus(),
      ).fill(),
    async (terminal, app) => {
      pointer(terminal, "press", 8, 1);
      pointer(terminal, "release", 10, 1);
      await app.flush();
      terminal.dispatch({ type: "key", event: keyEvent("w", { alt: true }) });
      await app.flush();
      expect(terminal.clipboardText).toBe("ab");
      expect(terminal.output.join("")).toContain("\x1b[2;11H\x1b[?25h");
      terminal.dispatch({ type: "key", event: keyEvent("X", { text: "X" }) });
      await app.flush();
      expect(terminal.screen?.toString().split("\n")[1]).toBe("         Xcd");
    },
  );
});
test("translation updates and scroll-only movement do not accumulate offsets or leave stale cells", async () => {
  let change = (_x: number): void => {};
  await session(
    () => {
      const [x, setX] = useState(1);
      change = setX;
      return column(
        scroll(text("a\nb\nc\nd").translate(x, 0), { scrollbar: "hidden" })
          .width(10)
          .height(2)
          .autoFocus(),
      );
    },
    async (terminal, app) => {
      for (const x of [3, -1, 2]) {
        change(x);
        await app.flush();
        expect(terminal.screen?.toString().split("\n")[0]).toBe(
          x < 0 ? "" : " ".repeat(x) + "a",
        );
      }
      terminal.dispatch({ type: "key", event: keyEvent("down") });
      await app.flush();
      expect(terminal.screen?.toString().split("\n").slice(0, 2)).toEqual([
        "  b",
        "  c",
      ]);
      expect(app.stats.layoutNodes).toBe(0);
      terminal.resize(21, 8);
      await app.flush();
      expect(terminal.screen?.toString().split("\n").slice(0, 2)).toEqual([
        "  b",
        "  c",
      ]);
    },
  );
});

test("part-only interaction changes repaint retained placeholders and scrollbar thumbs", async () => {
  await session(
    () =>
      column(
        input({ placeholder: "Search" })
          .autoFocus()
          .placeholder(style().color("gray").focused(style().color("cyan"))),
        button("next", () => {}),
        scroll(text("a\nb\nc\nd"), { scrollbar: "visible" })
          .width(4)
          .height(2)
          .scrollbarThumb(
            style().color("red").hovered(style().color("yellow")),
          ),
      ),
    async (terminal, app) => {
      expect(terminal.screen?.get(0, 0)?.style.foreground).toBe("cyan");
      terminal.dispatch({ type: "key", event: keyEvent("tab") });
      await app.flush();
      expect(terminal.screen?.get(0, 0)?.style.foreground).toBe("gray");
      pointer(terminal, "move", 3, 2);
      await app.flush();
      expect(terminal.screen?.get(3, 2)?.style.foreground).toBe("yellow");
    },
  );
});
