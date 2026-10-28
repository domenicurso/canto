import { expect, test } from "bun:test";

import type { TerminalEvent } from "./events";
import type { ThemeReport } from "./theme";

import { rgb } from "../style/colors";
import { Decoder } from "./decoder";
import { TerminalColors, themeResponse } from "./theme";

test("theme reports survive every byte split without leaking into keyboard or paste input", () => {
  const reports: ThemeReport[] = [];
  const events: TerminalEvent[] = [];
  const decoder = new Decoder(
    (event) => events.push(event),
    undefined,
    undefined,
    { theme: (report) => reports.push(report) },
  );
  const input =
    "\x1b]10;rgb:ffff/8080/0000\x1b\\\x1b]11;rgb:1/2/f\x07\x1b]4;1;rgb:12/34/56;9;rgb:abcd/1234/ffff\x1b\\";
  for (const byte of Buffer.from(input)) decoder.push(new Uint8Array([byte]));
  expect(reports).toEqual([
    { target: "foreground", color: [255, 128, 0] },
    { target: "background", color: [17, 34, 255] },
    { target: 1, color: [18, 52, 86] },
    { target: 9, color: [171, 18, 255] },
  ]);
  expect(events).toHaveLength(0);
  decoder.push(Buffer.from("\x1b[200~" + input + "\x1b[201~z"));
  expect(
    events.map(
      (event) => event.type === "key" && [event.event.key, event.event.text],
    ),
  ).toEqual([
    ["paste", input],
    ["z", "z"],
  ]);
  expect(reports).toHaveLength(4);
});
test("invalid and unrelated OSC replies are consumed without changing the theme", () => {
  for (const payload of [
    "10;rgb:zz/ff/ff",
    "4;16;rgb:ff/ff/ff",
    "4;-1;rgb:ff/ff/ff",
    "4;;rgb:ff/ff/ff",
    "52;c;abcd",
    "11;not-a-color",
  ])
    expect(themeResponse(`\x1b]${payload}\x07`)?.reports).toEqual([]);
  expect(themeResponse("\x1b]10;rgb:ff")).toEqual({ length: 0, reports: [] });
  expect(
    themeResponse("\x1b]10;rgb:ff/ff/ff;rgb:00/00/00\x07")?.reports,
  ).toHaveLength(2);
});
test("theme snapshots change only for new colors and named ANSI colors use the reported palette", () => {
  const colors = new TerminalColors();
  const before = colors.theme;
  expect(colors.report({ target: 1, color: [50, 60, 70] })).toBe(true);
  expect(before.palette).toBeUndefined();
  expect(rgb("red", colors.theme)).toEqual([50, 60, 70]);
  expect(colors.report({ target: 1, color: [50, 60, 70] })).toBe(false);
  expect(rgb("#123", colors.theme)).toEqual([17, 34, 51]);
});
