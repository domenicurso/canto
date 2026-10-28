import { expect, test } from "bun:test";

import type { App, Child, PixelBuffer } from "../../index";
import type { Screen } from "./screen";

import {
  canvas,
  column,
  createApp,
  MemoryTerminal,
  overlay,
  text,
} from "../../index";
import { GraphicsOutput } from "../terminal/graphics-output";

const pixels: PixelBuffer = {
  width: 8,
  height: 8,
  data: new Uint8Array(
    Array.from({ length: 64 }, (_, index) =>
      index % 2 ? [255, 0, 0, 255] : [0, 255, 0, 255],
    ).flat(),
  ),
};
async function render(
  view: () => Child,
  check: (screen: Screen, app: App, terminal: MemoryTerminal) => Promise<void>,
  sixel = false,
): Promise<void> {
  const terminal = new MemoryTerminal(4, 4);
  terminal.cellSize = { width: 2, height: 2 };
  terminal.graphics = { kitty: !sixel, sixel };
  const app = createApp(view, { terminal });
  const running = app.run();
  try {
    await Bun.sleep(0);
    if (!terminal.screen) throw new Error("Expected an initial presentation.");
    await check(terminal.screen, app, terminal);
  } finally {
    app.stop();
    await running;
  }
}
function colorAt(screen: Screen, x: number, y: number): number[] | undefined {
  const image = screen.rasters.find(
    (image) =>
      x / 2 >= image.rect.x &&
      y / 2 >= image.rect.y &&
      x / 2 < image.rect.x + image.rect.width &&
      y / 2 < image.rect.y + image.rect.height,
  );
  if (!image) return undefined;
  const px = Math.floor(
    ((x / 2 - image.rect.x) * image.buffer.width) / image.rect.width,
  );
  const py = Math.floor(
    ((y / 2 - image.rect.y) * image.buffer.height) / image.rect.height,
  );
  const offset = (py * image.buffer.width + px) * 4;
  return Array.from(image.buffer.data.slice(offset, offset + 4));
}
test.each([false, true])(
  "native overlays retain individual source pixels and tint only the overlap, sixel=%s",
  async (sixel) => {
    await render(
      () =>
        overlay(
          canvas(pixels, { fit: "fill" }).fill(),
          column()
            .width(2)
            .height(2)
            .position("absolute")
            .left(1)
            .top(1)
            .background("#fff")
            .opacity(0.5),
        ).fill(),
      async (screen) => {
        for (let y = 0; y < 8; y++) {
          for (let x = 0; x < 8; x++) {
            const source = x % 2 ? [255, 0, 0] : [0, 255, 0];
            const tinted = x >= 2 && x < 6 && y >= 2 && y < 6;
            expect(colorAt(screen, x, y)).toEqual([
              ...source.map((channel) =>
                tinted ? Math.round(channel * 0.5 + 127.5) : channel,
              ),
              255,
            ]);
          }
        }
      },
      sixel,
    );
  },
);
test("opaque occlusion crops native graphics and Kitty keeps wide text above pixels", async () => {
  await render(
    () =>
      overlay(
        canvas(pixels, { fit: "fill" }).fill(),
        text("界").position("absolute").left(0).top(0),
        column()
          .width(1)
          .height(1)
          .position("absolute")
          .left(2)
          .top(2)
          .background("#fff"),
      ).fill(),
    async (screen) => {
      expect(screen.toString()).toContain("界");
      expect(screen.get(1, 0)?.continuation).toBe(true);
      expect(colorAt(screen, 0, 0)).toEqual([0, 255, 0, 255]);
      expect(colorAt(screen, 4, 4)).toBeUndefined();
      expect(colorAt(screen, 6, 4)).toEqual([0, 255, 0, 255]);
    },
  );
});
test("Sixel limits the cell approximation to text cells while preserving native pixels elsewhere", async () => {
  await render(
    () =>
      overlay(
        canvas(pixels, { fit: "fill" }).fill(),
        text("X").position("absolute").left(0).top(0),
      ).fill(),
    async (screen) => {
      expect(screen.toString()).toContain("X");
      expect(colorAt(screen, 0, 0)).toBeUndefined();
      expect(colorAt(screen, 2, 0)).toEqual([0, 255, 0, 255]);
      expect(colorAt(screen, 0, 2)).toEqual([0, 255, 0, 255]);
    },
    true,
  );
});
test("nested opacity composites native canvases once against their underlying image", async () => {
  await render(
    () =>
      overlay(
        canvas(pixels, { fit: "fill" }).fill(),
        column(
          canvas(
            { width: 1, height: 1, data: new Uint8Array([0, 0, 255, 255]) },
            { fit: "fill" },
          )
            .fill()
            .opacity(0.5),
        )
          .fill()
          .opacity(0.5),
      ).fill(),
    async (screen) => {
      expect(colorAt(screen, 0, 0)).toEqual([0, 192, 64, 255]);
      expect(colorAt(screen, 1, 0)).toEqual([192, 0, 64, 255]);
    },
  );
});
test("static native regions retain upload identities across inspector-only frames", async () => {
  await render(
    () => canvas(pixels, { fit: "fill" }).fill(),
    async (screen, app, terminal) => {
      const graphics = new GraphicsOutput();
      graphics.update(screen.rasters);
      app.debug.toggle();
      await app.flush();
      graphics.update(terminal.screen?.rasters ?? []);
      const owners = terminal.screen?.rasters.map((image) => image.owner);
      await app.flush();
      expect(terminal.screen?.rasters.map((image) => image.owner)).toEqual(
        owners,
      );
      expect(
        graphics.update(terminal.screen?.rasters ?? []).output,
      ).not.toContain("a=t");
      app.debug.toggle();
      await app.flush();
      expect(terminal.screen?.rasters[0]?.owner).toBe(screen.rasters[0]?.owner);
    },
  );
});
