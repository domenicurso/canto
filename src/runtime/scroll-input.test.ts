import { expect, test } from "bun:test";

import type { ScrollPosition } from "../../index";

import {
  createApp,
  keyEvent,
  MemoryTerminal,
  scroll,
  text,
  useState,
} from "../../index";
import { Decoder } from "../terminal/decoder";

const content =
  "0123456789abcdef\nghijklmnopqrstuv\nwxyzABCDEFGHIJKL\nMNOPQRSTUVWXYZ!?";
test.each([false, true])(
  "keyboard and wheel move both axes by one cell (controlled: %s)",
  async (controlled) => {
    const terminal = new MemoryTerminal(5, 2);
    terminal.cellSize = { width: 10, height: 10 };
    const app = createApp(
      () => {
        const [offset, onScroll] = useState<ScrollPosition>({ x: 0, y: 0 });
        return scroll(
          text(content),
          controlled
            ? { axis: "both", offset, onScroll, scrollbar: "hidden" }
            : { axis: "both", scrollbar: "hidden" },
        )
          .fill()
          .autoFocus();
      },
      { terminal },
    );
    const decoder = new Decoder((event) => terminal.dispatch(event));
    const running = app.run();
    try {
      await Bun.sleep(0);
      terminal.dispatch({ type: "key", event: keyEvent("right") });
      await app.flush();
      expect(terminal.screen?.toString()).toBe("12345\nhijkl");
      decoder.push(Buffer.from("\x1b[<65;2;1M"));
      await app.flush();
      expect(terminal.screen?.toString()).toBe("hijkl\nxyzAB");
      decoder.push(Buffer.from("\x1b[<67;2;1M"));
      await app.flush();
      expect(terminal.screen?.toString()).toBe("ijklm\nyzABC");
      decoder.push(Buffer.from("\x1b[<68;2;1M"));
      await app.flush();
      expect(terminal.screen?.toString()).toBe("hijkl\nxyzAB");
      decoder.push(Buffer.from("\x1b[<64;2;1M"));
      await app.flush();
      expect(terminal.screen?.toString()).toBe("12345\nhijkl");
    } finally {
      app.stop();
      await running;
    }
  },
);
test("horizontal-only regions support arrows, wheel, page size, and clamping", async () => {
  const terminal = new MemoryTerminal(5, 1);
  terminal.cellSize = { width: 10, height: 10 };
  const app = createApp(
    () =>
      scroll(text("0123456789abcdef"), {
        axis: "horizontal",
        scrollbar: "hidden",
      })
        .fill()
        .autoFocus(),
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    terminal.dispatch({ type: "key", event: keyEvent("right") });
    await app.flush();
    expect(terminal.screen?.toString()).toBe("12345");
    terminal.dispatch({
      type: "mouse",
      event: { action: "scroll", x: 0, y: 0, button: 1, deltaY: 1 },
    });
    await app.flush();
    expect(terminal.screen?.toString()).toBe("23456");
    terminal.dispatch({ type: "key", event: keyEvent("pagedown") });
    await app.flush();
    expect(terminal.screen?.toString()).toBe("789ab");
    for (let index = 0; index < 30; index++) {
      terminal.dispatch({ type: "key", event: keyEvent("right") });
      await app.flush();
    }
    expect(terminal.screen?.toString()).toBe("bcdef");
  } finally {
    app.stop();
    await running;
  }
});
