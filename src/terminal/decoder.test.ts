import { expect, test } from "bun:test";

import type { TerminalEvent } from "./events";

import { Decoder } from "./decoder";

test("escape sequences and UTF-8 survive arbitrary input chunk boundaries", () => {
  const events: TerminalEvent[] = [];
  const decoder = new Decoder((event) => events.push(event));
  for (const byte of Buffer.from("\x1b[A🙂"))
    decoder.push(new Uint8Array([byte]));
  expect(
    events.map((event) => (event.type === "key" ? event.event.key : "")),
  ).toEqual(["up", "🙂"]);
});
test("bracketed paste is delivered as one text event", () => {
  const events: TerminalEvent[] = [];
  const decoder = new Decoder((event) => events.push(event));
  for (const byte of Buffer.from("\x1b[200~hi\nthere\x1b[201~"))
    decoder.push(new Uint8Array([byte]));
  expect(events).toHaveLength(1);
  expect(events[0]?.type === "key" && events[0].event.text).toBe("hi\nthere");
});
test("lone escape is resolved separately from incomplete CSI input", () => {
  const events: TerminalEvent[] = [];
  const decoder = new Decoder((event) => events.push(event));
  decoder.push(Buffer.from("\x1b"));
  decoder.flushEscape();
  expect(events[0]?.type === "key" && events[0].event.key).toBe("escape");
});

test("expired partial control sequences do not consume subsequent typing", () => {
  for (const prefix of ["\x1b[", "\x1b[1;", "\x1b[<0;", "\x1bO"]) {
    const events: TerminalEvent[] = [];
    const decoder = new Decoder((event) => events.push(event));
    decoder.push(Buffer.from(prefix));
    decoder.flushEscape();
    decoder.push(Buffer.from("hello"));
    expect(
      events.map((event) => event.type === "key" && event.event.key),
    ).toEqual(["h", "e", "l", "l", "o"]);
  }
});

test("abandoned and oversized pastes recover without leaking paste shortcuts", () => {
  const events: TerminalEvent[] = [];
  const decoder = new Decoder((event) => events.push(event));
  decoder.push(Buffer.from("\x1b[200~unfinished"));
  decoder.flushEscape();
  expect(events).toHaveLength(0);
  decoder.discardPending();
  decoder.push(Buffer.from("a"));
  decoder.push(Buffer.from("\x1b[200~" + "x".repeat(1024 * 1024 + 1)));
  decoder.push(Buffer.from("\x03discarded\x1b[20"));
  decoder.push(Buffer.from("1~b"));
  expect(
    events.map((event) => event.type === "key" && event.event.key),
  ).toEqual(["a", "b"]);
});

test("continuous malformed control input is bounded without an idle timeout", () => {
  const keys: string[] = [];
  const decoder = new Decoder((event) => {
    if (event.type === "key") keys.push(event.event.key);
  });
  decoder.push(Buffer.from("\x1b[" + "1".repeat(4096)));
  decoder.push(Buffer.from("hello"));
  expect(keys).toEqual(["h", "e", "l", "l", "o"]);
});

test("wheel reports preserve both axes and Shift+wheel selects horizontal movement", () => {
  const events: TerminalEvent[] = [];
  const decoder = new Decoder((event) => events.push(event));
  for (const code of [64, 65, 66, 67, 68, 69]) {
    for (const byte of Buffer.from(`\x1b[<${code};3;4M`))
      decoder.push(new Uint8Array([byte]));
  }
  expect(
    events.map(
      (event) =>
        event.type === "mouse" && [event.event.deltaX, event.event.deltaY],
    ),
  ).toEqual([
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
    [-1, 0],
    [1, 0],
  ]);
});

test("arrow and mouse modifiers survive bytewise terminal input", () => {
  const events: TerminalEvent[] = [];
  const decoder = new Decoder((event) => events.push(event));
  for (const byte of Buffer.from("\x1b[1;6C\x1b[1;3D\x1b[1;10A\x1b[<28;3;4M"))
    decoder.push(new Uint8Array([byte]));
  expect(
    events.map((event) =>
      event.type === "key"
        ? [
            event.event.key,
            event.event.shift,
            event.event.alt,
            event.event.ctrl,
            event.event.meta,
          ]
        : event.type === "mouse"
          ? [event.event.shift, event.event.alt, event.event.ctrl]
          : null,
    ),
  ).toEqual([
    ["right", true, false, true, false],
    ["left", false, true, false, false],
    ["up", true, false, false, true],
    [true, true, true],
  ]);
});
