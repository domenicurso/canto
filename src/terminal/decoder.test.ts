import { Decoder } from "./decoder";
import { expect, test } from "bun:test";

import type { TerminalEvent } from "./events";

test("escape sequences and UTF-8 survive arbitrary input chunk boundaries", () => {
  const events: TerminalEvent[] = [];
  const decoder = new Decoder((event) => events.push(event));
  for (const byte of Buffer.from("\x1b[A🙂")) decoder.push(new Uint8Array([byte]));
  expect(events.map((event) => (event.type === "key" ? event.event.key : ""))).toEqual([
    "up",
    "🙂",
  ]);
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
