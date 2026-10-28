import { canvas, createApp, MemoryTerminal } from "../../index";
import { parseGitStatus } from "./git-status";
import { Image } from "./image";
import { decodePng, drawRaster } from "./image-raster";
import { expect, test } from "bun:test";
import { PNG } from "pngjs";

test("Git porcelain records preserve spaces, Unicode, newlines, and rename pairs", () => {
  const files = parseGitStatus(
    " M a b.ts\0?? 日本語\nfile.ts\0R  new.ts\0old.ts\0UU conflict.ts\0",
  );
  expect(files.map(({ path, status }) => ({ path, status }))).toEqual([
    { path: "a b.ts", status: "MODIFIED" },
    { path: "日本語\nfile.ts", status: "UNTRACKED" },
    { path: "old.ts → new.ts", status: "RENAMED" },
    { path: "conflict.ts", status: "UNMERGED" },
  ]);
  expect(parseGitStatus("")).toEqual([]);
  expect(() => parseGitStatus("M\0")).toThrow("Malformed");
  expect(() => parseGitStatus("R  target\0")).toThrow("rename source");
});
test("PNG decoding paints upper/lower pixels and composites transparency over black", async () => {
  const png = new PNG({ width: 1, height: 2 });
  png.data.set([255, 0, 0, 255, 0, 255, 0, 128]);
  const raster = decodePng(PNG.sync.write(png));
  const terminal = new MemoryTerminal(1, 1);
  const app = createApp(() => canvas((draw) => drawRaster(draw, raster)).fill(), { terminal });
  const running = app.run();
  try {
    await Bun.sleep(0);
    expect(terminal.screen?.get(0, 0)).toMatchObject({
      text: "▀",
      style: { foreground: [255, 0, 0], background: [0, 128, 0] },
    });
  } finally {
    app.stop();
    await running;
  }
  expect(() => decodePng(new Uint8Array([1, 2, 3]))).toThrow();
});
test("image file errors appear in the view and still release the terminal", async () => {
  const terminal = new MemoryTerminal(80, 24);
  const app = createApp(() => Image("/nonexistent-canto-example.png"), { terminal });
  const running = app.run();
  try {
    for (let attempt = 0; attempt < 20; attempt++) {
      await Bun.sleep(5);
      await app.flush();
    }
    expect(terminal.screen?.toString()).toContain("ENOENT");
  } finally {
    app.stop();
    await running;
  }
  expect(terminal.stopped).toBe(true);
});
