import { expect, test } from "bun:test";

import type { PixelBuffer } from "../../index";

import { canvas, createApp, MemoryTerminal, useState } from "../../index";

test("pixel callbacks use physical cell metrics, resize their source, and keep native animation out of cell diffs", async () => {
  const terminal = new MemoryTerminal(10, 5);
  terminal.cellSize = { width: 9, height: 21 };
  terminal.graphics.kitty = true;
  let change = (_value: number): void => {};
  const sizes: number[][] = [];
  const app = createApp(
    () => {
      const [shade, setShade] = useState(255);
      change = setShade;
      return canvas((draw) => {
        sizes.push([draw.pixelWidth, draw.pixelHeight]);
        draw.pixels({
          width: draw.pixelWidth,
          height: draw.pixelHeight,
          data: new Uint8Array(draw.pixelWidth * draw.pixelHeight * 4).fill(
            shade,
          ),
        });
      }).fill();
    },
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    expect(sizes.at(-1)).toEqual([90, 105]);
    expect(terminal.screen?.rasters[0]?.buffer.width).toBe(90);
    expect(terminal.screen?.rasters[0]?.buffer.height).toBe(105);
    change(0);
    await app.flush();
    expect(app.stats.cellsWritten).toBe(0);
    expect(terminal.output.at(-1)).toBe("\x1b[?25l");
    terminal.cellSize = { width: 12, height: 24 };
    terminal.resize(12, 6);
    await app.flush();
    expect(sizes.at(-1)).toEqual([144, 144]);
    terminal.graphics.kitty = false;
    terminal.resize(12, 6);
    await app.flush();
    expect(terminal.screen?.rasters).toHaveLength(0);
  } finally {
    app.stop();
    await running;
  }
});

test("a callback that stops supplying pixels removes its native image", async () => {
  const terminal = new MemoryTerminal(4, 2);
  terminal.graphics.kitty = true;
  let change = (_value: boolean): void => {};
  const red: PixelBuffer = {
    width: 1,
    height: 1,
    data: new Uint8Array([255, 0, 0, 255]),
  };
  const app = createApp(
    () => {
      const [visible, setVisible] = useState(true);
      change = setVisible;
      return canvas((draw) => {
        if (visible) draw.pixels(red);
        else draw.write(0, 0, "gone");
      }).fill();
    },
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    expect(terminal.screen?.rasters).toHaveLength(1);
    change(false);
    await app.flush();
    expect(terminal.screen?.rasters).toHaveLength(0);
    expect(terminal.screen?.toString()).toContain("gone");
  } finally {
    app.stop();
    await running;
  }
});
