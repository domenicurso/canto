import { expect, test } from "bun:test";
import { inflateSync } from "node:zlib";

import type { RasterPlacement } from "../render/raster-placement";
import type { TerminalEvent } from "./events";

import { Decoder } from "./decoder";
import { GraphicsOutput } from "./graphics-output";
import { kittyUpload } from "./kitty-graphics";
import { sixel } from "./sixel";

function image(width = 1, height = 1): RasterPlacement {
  return {
    owner: {},
    rect: { x: 0, y: 0, width: 1, height: 1 },
    buffer: {
      width,
      height,
      data: new Uint8Array(width * height * 4).fill(255),
    },
    renderer: "kitty",
  };
}
test("graphics capability reports survive arbitrary chunks and never become keyboard events", () => {
  const events: TerminalEvent[] = [],
    replies: string[] = [];
  const decoder = new Decoder(
    (event) => events.push(event),
    undefined,
    undefined,
    (reply) => replies.push(reply),
  );
  for (const byte of Buffer.from("\x1b_Gi=2147483647;OK\x1b\\\x1b[?62;4;6cA"))
    decoder.push(new Uint8Array([byte]));
  expect(replies).toEqual(["kitty", "sixel"]);
  expect(
    events.map((event) => event.type === "key" && event.event.key),
  ).toEqual(["A"]);
  decoder.push(Buffer.from("\x1b_Gi=2147483647;ENOTSUP\x1b\\\x1b[?1;2c"));
  expect(replies).toHaveLength(2);
});
test("Kitty payloads are chunked, static images are retained, moves reuse data, and unmount frees owned IDs", () => {
  const large = image(64, 64);
  crypto.getRandomValues(large.buffer.data);
  const payload = kittyUpload(1, large);
  const chunks = [...payload.matchAll(/\x1b_G([^;]*);([^\x1b]*)\x1b\\/g)];
  expect(chunks.length).toBeGreaterThan(1);
  expect(chunks.every((chunk) => (chunk[2]?.length ?? 0) <= 4096)).toBe(true);
  const graphics = new GraphicsOutput();
  const first = graphics.update([large]);
  expect(first.output).toContain("a=t");
  expect(graphics.update([large]).output).toBe("");
  const moved = graphics.update([{ ...large, rect: { ...large.rect, x: 3 } }]);
  expect(moved.output).toContain("a=p");
  expect(moved.output).not.toContain("a=t");
  expect(graphics.update([]).output).toContain("d=I");
  expect(graphics.stop()).toBe("");
});
test("pixel changes upload again and shutdown deletes every image owned by this session", () => {
  const graphics = new GraphicsOutput(),
    first = image();
  graphics.update([first]);
  const updated = {
    ...first,
    buffer: { ...first.buffer, data: new Uint8Array([255, 0, 0, 255]) },
  };
  const output = graphics.update([updated]).output;
  expect(output.indexOf("a=t")).toBeLessThan(output.indexOf("a=p"));
  expect(output.indexOf("a=p")).toBeLessThan(output.indexOf("d=I"));
  expect(graphics.stop()).toContain("d=I");
});
test("Sixel encodes palette percentages, vertical bit bands, repeats, and damage on movement/removal", () => {
  const red = {
    width: 8,
    height: 7,
    data: new Uint8Array(
      Array.from({ length: 56 }, () => [255, 0, 0, 255]).flat(),
    ),
  };
  const encoded = sixel(red);
  expect(encoded).toContain('"1;1;8;7');
  expect(encoded).toContain("#180;2;100;0;0");
  expect(encoded).toContain("!8~");
  expect(encoded).toContain("!8@");
  const graphics = new GraphicsOutput(),
    source = { ...image(), renderer: "sixel" as const };
  expect(graphics.update([source]).output).toContain("\x1bP");
  expect(
    graphics.update([{ ...source, rect: { ...source.rect, x: 1 } }]).repaint,
  ).toBe(true);
  expect(graphics.update([]).repaint).toBe(true);
});

test("large flat rasters use lossless compression before Kitty chunking", () => {
  const source = image(128, 128);
  const encoded = kittyUpload(3, source);
  const chunks = [...encoded.matchAll(/\x1b_G([^;]*);([^\x1b]*)\x1b\\/g)];
  expect(chunks[0]?.[1]).toContain("o=z");
  const payload = Buffer.from(
    chunks.map((chunk) => chunk[2]).join(""),
    "base64",
  );
  expect(inflateSync(payload)).toEqual(Buffer.from(source.buffer.data));
  expect(payload.length).toBeLessThan(source.buffer.data.length / 10);
});
