import { expect, test } from "bun:test";

import type { Child, PixelBuffer } from "../../index";

import {
  canvas,
  column,
  createApp,
  MemoryTerminal,
  overlay,
  text,
  useState,
} from "../../index";
import { samplePixel } from "./pixel-sampling";
import { quadrant } from "./quadrants";

const red: PixelBuffer = {
  width: 1,
  height: 1,
  data: new Uint8Array([255, 0, 0, 255]),
};
async function render(
  view: () => Child,
  terminal = new MemoryTerminal(8, 4),
): Promise<MemoryTerminal> {
  const app = createApp(view, { terminal });
  const running = app.run();
  try {
    await Bun.sleep(0);
  } finally {
    app.stop();
    await running;
  }
  return terminal;
}
test("pixel buffers validate dimensions and RGBA length at the public canvas boundary", () => {
  expect(() => canvas({ ...red, width: 0 })).toThrow("RGBA");
  expect(() => canvas({ ...red, width: 1.5 })).toThrow("RGBA");
  expect(() => canvas({ ...red, height: 3 })).toThrow("RGBA");
  expect(() => canvas(red)).not.toThrow();
});
test("contain, cover, and fill use physical pixel dimensions and alpha composites over the surface", () => {
  const source = { ...red, data: new Uint8Array([255, 0, 0, 128]) };
  const background = [0, 0, 255] as const;
  expect(
    samplePixel(source, { x: 1, y: 1 }, { width: 8, height: 16 }, background),
  ).toEqual(background);
  expect(
    samplePixel(source, { x: 4, y: 8 }, { width: 8, height: 16 }, background),
  ).toEqual([128, 0, 127]);
  for (const fit of ["cover", "fill"] as const)
    expect(
      samplePixel(
        source,
        { x: 1, y: 1 },
        { width: 8, height: 16, fit },
        background,
      ),
    ).toEqual([128, 0, 127]);
});
test("quadrant encoding preserves every binary 2×2 pattern with foreground/background inversion", () => {
  const blocks = " ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█";
  for (let mask = 0; mask < 16; mask++) {
    const encoded = quadrant(
      Array.from({ length: 4 }, (_, index) =>
        mask & (1 << index) ? ([255, 0, 0] as const) : ([0, 0, 255] as const),
      ),
    );
    const bits = blocks.indexOf(encoded.text);
    for (let index = 0; index < 4; index++)
      expect(
        bits & (1 << index) ? encoded.foreground : encoded.background,
      ).toEqual(mask & (1 << index) ? [255, 0, 0] : [0, 0, 255]);
  }
});
test.each(["auto", "sixel", "quadrants"] as const)(
  "canvas chooses %s using Kitty → Sixel → quadrants",
  async (renderer) => {
    const terminal = new MemoryTerminal(8, 4);
    terminal.graphics = { kitty: true, sixel: true };
    await render(() => canvas(red, { renderer, fit: "fill" }).fill(), terminal);
    expect(terminal.screen?.rasters[0]?.renderer).toBe(
      renderer === "auto"
        ? "kitty"
        : renderer === "sixel"
          ? "sixel"
          : undefined,
    );
    if (renderer !== "quadrants")
      expect(terminal.screen?.rasters[0]?.buffer.width).toBe(
        renderer === "auto" ? 1 : 64,
      );
    const fallback = await render(() => canvas(red).fill());
    expect(fallback.screen?.rasters).toHaveLength(0);
  },
);
test("native canvases respect clipping and fall back when text or a portal covers them", async () => {
  const terminal = new MemoryTerminal(8, 4);
  terminal.graphics.kitty = true;
  await render(
    () => column(canvas(red).width(20).height(4)).width(4).height(3),
    terminal,
  );
  expect(terminal.screen?.rasters[0]?.rect).toEqual({
    x: 0,
    y: 0,
    width: 4,
    height: 3,
  });
  await render(
    () =>
      overlay(
        canvas(red).fill(),
        text("front").position("absolute").left(0).top(0),
      ).fill(),
    terminal,
  );
  expect(terminal.screen?.rasters).toHaveLength(0);
  await render(
    () =>
      column(
        canvas(red).fill(),
        overlay({ content: text("portal") })
          .width(6)
          .height(1),
      ).fill(),
    terminal,
  );
  expect(terminal.screen?.rasters).toHaveLength(0);
  expect(terminal.screen?.toString()).toContain("portal");
});
test("new pixel buffers repaint retained cells and native alpha uses the inherited surface background", async () => {
  const terminal = new MemoryTerminal(4, 2);
  terminal.graphics.kitty = true;
  let update = (_value: PixelBuffer): void => {};
  const app = createApp(
    () => {
      const [buffer, setBuffer] = useState(red);
      update = setBuffer;
      return column(canvas(buffer, { fit: "fill" }).fill())
        .fill()
        .background("blue");
    },
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    update({ ...red, data: new Uint8Array([255, 0, 0, 0]) });
    await app.flush();
    expect(
      Array.from(terminal.screen?.rasters[0]?.buffer.data.slice(0, 4) ?? []),
    ).toEqual([0, 0, 128, 255]);
    expect(terminal.screen?.get(0, 0)?.style.background).toEqual([0, 0, 128]);
  } finally {
    app.stop();
    await running;
  }
});
