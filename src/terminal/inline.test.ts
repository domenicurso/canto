import { expect, test } from "bun:test";

import type { Style } from "../style/types";

import { Styles } from "../../examples/styles";
import { createApp, keyEvent, MemoryTerminal } from "../../index";
import { ansi } from "../render/ansi";
import { diff } from "../render/diff";
import { Screen } from "../render/screen";
import { inlineOutput } from "./inline";

interface Cursor {
  x: number;
  y: number;
  rendition: string;
}
/** Model DEC save/restore including rendition, rather than treating it as cursor-only. */
class TerminalState {
  private cursor: Cursor = { x: 0, y: 0, rendition: "\x1b[0m" };
  private saved = { ...this.cursor };
  private readonly cells = new Map<
    string,
    { text: string; rendition: string }
  >();
  feed(output: string): void {
    const tokens =
      output.match(/\x1b(?:[78]|\[[\d;?]*[A-Za-z])|[^\x1b]/gu) ?? [];
    for (const token of tokens) {
      if (token === "\x1b7") this.saved = { ...this.cursor };
      else if (token === "\x1b8") this.cursor = { ...this.saved };
      else if (token.startsWith("\x1b[")) this.control(token);
      else {
        this.cells.set(`${this.cursor.x},${this.cursor.y}`, {
          text: token,
          rendition: this.cursor.rendition,
        });
        this.cursor.x++;
      }
    }
  }
  private control(token: string): void {
    const command = token.at(-1);
    const [first = 1, second = 1] = token.slice(2, -1).split(";").map(Number);
    if (command === "m") this.cursor.rendition = token;
    if (command === "H") {
      this.cursor.x = second - 1;
      this.cursor.y = first - 1;
    }
    if (command === "B") this.cursor.y += first || 1;
    if (command === "C") this.cursor.x += first || 1;
  }
  expectFrame(screen: Screen): void {
    for (let y = 0; y < screen.height; y++) {
      for (let x = 0; x < screen.width; x++) {
        const expected = screen.get(x, y);
        if (!expected)
          throw new Error("Expected a cell inside the screen bounds.");
        expect(this.cells.get(`${x},${y}`)).toEqual({
          text: expected.text,
          rendition: ansi(expected.style),
        });
      }
    }
  }
}
const area = { x: 0, y: 0, width: 18, height: 3 };
function frame(border: string, extra: Style = {}): Screen {
  const screen = new Screen(area.width, area.height);
  const borderStyle = { foreground: border, ...extra };
  screen.put(area, "╭──────╮  ╭──────╮", borderStyle, area);
  screen.put({ ...area, y: 1 }, "│      │  │      │", borderStyle, area);
  screen.put({ ...area, y: 2 }, "╰──────╯  ╰──────╯", borderStyle, area);
  screen.put(
    { ...area, x: 2, y: 1 },
    "Quit",
    { foreground: "white", background: "black" },
    area,
  );
  return screen;
}
test("sparse inline border updates retain the intended color after each cursor restore", () => {
  const terminal = new TerminalState();
  terminal.feed("\x1b7");
  const previous = frame("#475569");
  terminal.feed(inlineOutput(diff(undefined, previous).output));
  const next = frame("cyan");
  terminal.feed(inlineOutput(diff(previous, next).output));
  terminal.expectFrame(next);
});
test("inline updates restore border faint and background attributes across unchanged gaps", () => {
  const terminal = new TerminalState();
  terminal.feed("\x1b[0;35m\x1b7");
  const previous = frame("white");
  terminal.feed(inlineOutput(diff(undefined, previous).output));
  const next = frame("#475569", { faint: true, background: "blue" });
  terminal.feed(inlineOutput(diff(previous, next).output));
  terminal.expectFrame(next);
});
test("inline movement preserves coordinates for first-row and first-column targets", () => {
  expect(inlineOutput("\x1b[1;1HA\x1b[2;4HB")).toBe(
    "\x1b8A\x1b8\x1b[1B\x1b[3CB",
  );
});

test("the styling example keeps every cell's rendition through inline focus and hover updates", async () => {
  const terminal = new MemoryTerminal(80, 24);
  const app = createApp(Styles, { mode: "inline", terminal });
  const running = app.run();
  const emulated = new TerminalState();
  emulated.feed("\x1b7");
  let presented = 0;
  const verify = (): void => {
    for (const output of terminal.output.slice(presented))
      emulated.feed(inlineOutput(output));
    presented = terminal.output.length;
    if (!terminal.screen)
      throw new Error("Expected a committed styling frame.");
    emulated.expectFrame(terminal.screen);
  };
  try {
    await Bun.sleep(0);
    verify();
    for (let tab = 0; tab < 3; tab++) {
      terminal.dispatch({ type: "key", event: keyEvent("tab") });
      await app.flush();
      verify();
    }
    const quit =
      terminal.screen?.cells.findIndex((cell) => cell.text === "Q") ?? -1;
    expect(quit).toBeGreaterThan(0);
    terminal.dispatch({
      type: "mouse",
      event: {
        x: quit % 80,
        y: Math.floor(quit / 80),
        action: "move",
        button: 0,
        deltaY: 0,
      },
    });
    await app.flush();
    verify();
  } finally {
    app.stop();
    await running;
  }
});
