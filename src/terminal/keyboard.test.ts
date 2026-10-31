import { expect, test } from "bun:test";

import type { KeyEvent } from "../element/events";

import { createApp, input, MemoryTerminal } from "../../index";
import { Decoder } from "./decoder";

function decoded(bytes: string): KeyEvent[] {
  const events: KeyEvent[] = [];
  const decoder = new Decoder((event) => {
    if (event.type === "key") events.push(event.event);
  });
  for (const byte of Buffer.from(bytes)) decoder.push(new Uint8Array([byte]));
  return events;
}

test("enhanced and legacy arrows preserve Alt, Ctrl, Shift, and repeat subfields", () => {
  const events = decoded(
    "\x1b[1;4D\x1b[1;5C\x1b[1;6:2D\x1b[98;4u\x1b[99;5u\x1b[27;6;102~",
  );
  expect(
    events.map(({ key, alt, ctrl, shift }) => [key, alt, ctrl, shift]),
  ).toEqual([
    ["left", true, false, true],
    ["right", false, true, false],
    ["left", false, true, true],
    ["b", true, false, true],
    ["c", false, true, false],
    ["f", false, true, true],
  ]);
});

test("release, invalid Unicode, and invalid modifiers never become text input", () => {
  const events = decoded(
    "\x1b[97;1:3u\x1b[1;5:3C\x1b[1114112u\x1b[55296u\x1b[57344u\x1b[97;0u\x1b[97;1;3uZ",
  );
  expect(events.map((event) => event.key)).toEqual(["Z"]);
});

test("CSI-u retains printable text, alternate values, control keys, and pure text events", () => {
  const events = decoded(
    "\x1b[97:65;2;65u\x1b[0;;229u\x1b[32;2u\x1b[13u\x1b[9u\x1b[127u\x1b[27u",
  );
  expect(events.map(({ key, text, shift }) => [key, text, shift])).toEqual([
    ["a", "A", true],
    ["text", "å", false],
    [" ", " ", true],
    ["enter", undefined, false],
    ["tab", undefined, false],
    ["backspace", undefined, false],
    ["escape", undefined, false],
  ]);
});

test("legacy word-navigation encodings retain uppercase Shift and control modifiers", () => {
  const events = decoded("\x1bb\x1bF\x1b\x03");
  expect(
    events.map(({ key, alt, shift, ctrl }) => [key, alt, shift, ctrl]),
  ).toEqual([
    ["b", true, false, false],
    ["f", true, true, false],
    ["c", true, false, true],
  ]);
});

test.each(["\x1b[1;3C\x1b[1;4C", "\x1b[1;5C\x1b[1;6C", "\x1bf\x1bF"])(
  "terminal word selection edits the source through %j",
  async (movement) => {
    const terminal = new MemoryTerminal(40, 4);
    let result = "one café 界 two";
    const app = createApp(
      () =>
        input({
          defaultValue: result,
          onChange: (value) => {
            result = value;
          },
        }).autoFocus(),
      { terminal },
    );
    const running = app.run();
    const decoder = new Decoder((event) => terminal.dispatch(event));
    try {
      await Bun.sleep(0);
      for (const byte of Buffer.from(movement + "!"))
        decoder.push(new Uint8Array([byte]));
      await app.flush();
      expect(result).toBe("one! 界 two");
    } finally {
      app.stop();
      await running;
    }
  },
);
