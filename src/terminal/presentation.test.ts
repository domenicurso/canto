import { expect, test } from "bun:test";

import { Screen } from "../render/screen";
import { Presentation } from "./presentation";

test("presentation reports native encoding, bytes, and output backpressure after the write completes", async () => {
  const presentation = new Presentation();
  const screen = new Screen(8, 4);
  screen.rasters = [
    {
      owner: {},
      rect: { x: 0, y: 0, width: 8, height: 4 },
      buffer: { width: 1, height: 1, data: new Uint8Array([255, 0, 0, 255]) },
      renderer: "kitty",
    },
  ];
  let output = "";
  let release = (): void => {};
  const pending = presentation.present(screen, "cells", {
    mode: "fullscreen",
    height: 4,
    query: "",
    write: async (value) => {
      output = value;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    },
  });
  expect(presentation.stats).toBeUndefined();
  expect(output).toContain("a=t");
  expect(output).toContain("z=-1");
  await Bun.sleep(15);
  release();
  await pending;
  expect(presentation.stats?.bytes).toBe(Buffer.byteLength(output));
  expect(presentation.stats?.encodeTime).toBeGreaterThanOrEqual(0);
  expect(presentation.stats?.writeTime).toBeGreaterThanOrEqual(10);
  await presentation.present(screen, "", {
    mode: "fullscreen",
    height: 4,
    query: "",
    write: async (value) => {
      output = value;
    },
  });
  expect(output).not.toContain("a=t");
});
