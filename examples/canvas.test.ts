import { expect, test } from "bun:test";

import { createApp, MemoryTerminal } from "../index";
import { Canvas } from "./canvas";
import { waveform, waveformBackground } from "./waveform";

test("waveform rasterization keeps antialiased edges at the requested resolution", () => {
  const pixels = waveform(800, 400, 0);
  expect(pixels.data).toHaveLength(800 * 400 * 4);
  expect(pixels.data[3]).toBe(255);
  expect(Array.from(pixels.data.slice(0, 4))).toEqual([
    ...waveformBackground,
    255,
  ]);
  expect(Array.from(pixels.data.slice(4, 8))).toEqual([
    ...waveformBackground,
    255,
  ]);
  const secondRow = pixels.width * 4;
  expect(Array.from(pixels.data.slice(secondRow, secondRow + 4))).toEqual([
    ...waveformBackground,
    255,
  ]);
  const edge = Array.from(
    { length: 400 },
    (_, y) => pixels.data[(y * 800 + 101) * 4],
  );
  expect(edge.some((red) => red !== undefined && red > 15 && red < 103)).toBe(
    true,
  );
  expect(waveform(800, 400, 1).data).not.toEqual(pixels.data);
});

test("canvas example submits a native raster at its physical inner size", async () => {
  const terminal = new MemoryTerminal(50, 20);
  terminal.cellSize = { width: 9, height: 21 };
  terminal.graphics.kitty = true;
  const app = createApp(Canvas, { terminal });
  const running = app.run();
  try {
    await Bun.sleep(0);
    const image = terminal.screen?.rasters[0];
    expect(image).toBeDefined();
    // The outer layout has one padding cell; the border occupies the next cell.
    expect(terminal.screen?.get(1, 3)?.style.background).toEqual(
      waveformBackground,
    );
    expect(terminal.screen?.get(2, 3)?.style.background).toEqual(
      waveformBackground,
    );
    expect(terminal.screen?.get(1, 4)?.style.background).toEqual(
      waveformBackground,
    );
    expect(image?.rect.x).toBe(2);
    expect(image?.rect.y).toBe(4);
    expect(image?.rect.width).toBe(terminal.width - 4);
    expect(image?.buffer.width).toBe((image?.rect.width ?? 0) * 9);
    expect(image?.buffer.height).toBe((image?.rect.height ?? 0) * 21);
    terminal.resize(70, 24);
    await app.flush();
    expect(terminal.screen?.rasters[0]?.buffer.width).toBeGreaterThan(
      image?.buffer.width ?? 0,
    );
  } finally {
    app.stop();
    await running;
  }
});
