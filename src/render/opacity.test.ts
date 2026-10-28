import { expect, test } from "bun:test";

import type { Child, PixelBuffer } from "../../index";

import {
  box,
  canvas,
  column,
  createApp,
  MemoryTerminal,
  overlay,
  row,
  text,
  useState,
} from "../../index";

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
test("opacity composites an overlapping subtree once and nested opacity multiplies", async () => {
  const terminal = await render(() =>
    column(
      box(
        overlay(text("back").color("#f00"), text("front").color("#fff")),
      ).opacity(0.5),
    ).background("#000"),
  );
  expect(terminal.screen?.get(0, 0)?.style.foreground).toEqual([128, 128, 128]);
  const nested = await render(() =>
    column(box(text("x").color("#fff").opacity(0.5)).opacity(0.5)).background(
      "#000",
    ),
  );
  expect(nested.screen?.get(0, 0)?.style.foreground).toEqual([64, 64, 64]);
  const hidden = await render(() =>
    overlay(text("under"), text("front").opacity(0)),
  );
  expect(hidden.screen?.toString().split("\n")[0]).toBe("under");
});
test("opacity blends default, ANSI palette, background, inverse, and underline colors against the queried theme", async () => {
  const terminal = new MemoryTerminal(8, 4);
  terminal.theme = {
    foreground: [240, 220, 200],
    background: [20, 40, 60],
    palette: { 1: [200, 0, 0] },
  };
  await render(
    () =>
      column(
        text("x").opacity(0.5),
        text("x")
          .color("red")
          .background("#fff")
          .underline()
          .underlineColor("red")
          .opacity(0.5),
        text("x").inverse().opacity(0.5),
      ),
    terminal,
  );
  expect(terminal.screen?.get(0, 0)?.style.foreground).toEqual([130, 130, 130]);
  expect(terminal.screen?.get(0, 1)?.style).toMatchObject({
    foreground: [110, 20, 30],
    background: [138, 148, 158],
    underlineColor: [110, 20, 30],
  });
  expect(terminal.screen?.get(0, 2)?.style).toMatchObject({
    foreground: [20, 40, 60],
    background: [130, 130, 130],
    inverse: false,
  });
});
test("late theme replies and opacity changes repaint retained content without changing layout", async () => {
  const terminal = new MemoryTerminal(8, 4);
  let change = (_alpha: number): void => {};
  const app = createApp(
    () => {
      const [alpha, setAlpha] = useState(0.5);
      change = setAlpha;
      return column(text("界").color("red").opacity(alpha));
    },
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    terminal.theme = { background: [40, 40, 40], palette: { 1: [200, 0, 0] } };
    terminal.dispatch({ type: "resize" });
    await app.flush();
    expect(terminal.screen?.get(0, 0)?.style.foreground).toEqual([120, 20, 20]);
    expect(terminal.screen?.get(1, 0)?.continuation).toBe(true);
    change(0);
    await app.flush();
    expect(terminal.screen?.toString().trim()).toBe("");
    expect(app.stats.layoutNodes).toBe(0);
    change(1);
    await app.flush();
    expect(terminal.screen?.get(0, 0)?.style.foreground).toBe("red");
  } finally {
    app.stop();
    await running;
  }
});
test("translucent pixel canvases use composited quadrants and restore native graphics when opaque", async () => {
  const source: PixelBuffer = {
    width: 1,
    height: 1,
    data: new Uint8Array([255, 0, 0, 255]),
  };
  const terminal = new MemoryTerminal(8, 4);
  terminal.graphics.kitty = true;
  for (const alpha of [0.5, 0, 1]) {
    await render(
      () =>
        box(canvas(source, { fit: "fill" }).fill())
          .fill()
          .opacity(alpha),
      terminal,
    );
    expect(terminal.screen?.rasters).toHaveLength(alpha === 1 ? 1 : 0);
    if (alpha === 0) expect(terminal.screen?.toString().trim()).toBe("");
    if (alpha === 0.5)
      expect(terminal.screen?.get(0, 0)?.style.background).toEqual([128, 0, 0]);
  }
});

test("joined border junctions retain composited side colors and hidden panels paint no seams", async () => {
  const terminal = await render(() =>
    column(
      row(
        box().border("single").width(4).height(3),
        box()
          .border("single")
          .borderTopColor("#fff")
          .width(4)
          .height(3)
          .opacity(0.5),
      ).joinBorders(),
    ).background("#000"),
  );
  expect(terminal.screen?.get(3, 0)?.text).toBe("┬");
  expect(terminal.screen?.get(3, 0)?.style.foreground).toEqual([128, 128, 128]);
  const invisible = await render(() =>
    column(
      row(
        box().border("single").width(4).height(3),
        box().border("single").width(4).height(3).opacity(0),
      ).joinBorders(),
    ),
  );
  expect(invisible.screen?.toString().split("\n")[0]).toBe("┌──┐");
});
