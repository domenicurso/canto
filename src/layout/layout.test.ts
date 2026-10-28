import { expect, test } from "bun:test";

import type { Child, ElementRef } from "../../index";

import {
  box,
  column,
  createApp,
  MemoryTerminal,
  overlay,
  row,
  scroll,
  text,
} from "../../index";

async function render(
  view: () => Child,
  width = 30,
  height = 10,
): Promise<MemoryTerminal> {
  const terminal = new MemoryTerminal(width, height);
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
test("weighted fill divides remaining whole cells deterministically", async () => {
  const rects: Record<string, ElementRef["rect"]> = {};
  await render(
    () =>
      row(
        text("side").width(5),
        box()
          .width("fill")
          .grow(2)
          .ref((ref) => {
            if (ref) rects.a = ref.rect;
          }),
        box()
          .width("fill")
          .grow(1)
          .ref((ref) => {
            if (ref) rects.b = ref.rect;
          }),
      ).gap(1),
    22,
    3,
  );
  expect(rects.a?.width).toBe(10);
  expect(rects.b?.width).toBe(5);
});
test("borders and padding are included in explicit dimensions", async () => {
  const result = await render(() =>
    box(text("Hello")).width(12).height(5).padding(1).border("rounded"),
  );
  expect(result.screen?.toString().split("\n").slice(0, 5)).toEqual([
    "╭──────────╮",
    "│          │",
    "│ Hello    │",
    "│          │",
    "╰──────────╯",
  ]);
});
test("absolute children do not take flow space and later overlays paint on top", async () => {
  const result = await render(() =>
    overlay(
      text("abcdef"),
      text("XY").position("absolute").left(2).top(0).zIndex(1),
    ),
  );
  expect(result.screen?.toString().split("\n")[0]).toBe("abXYef");
});
test("text wraps at assigned width before following siblings are placed", async () => {
  const result = await render(() =>
    column(text("abcdefghij").width(4), text("after")).align("start"),
  );
  expect(result.screen?.toString().split("\n").slice(0, 4)).toEqual([
    "abcd",
    "efgh",
    "ij",
    "after",
  ]);
});
test("vertical scrolling wraps content to its viewport and clips children", async () => {
  const result = await render(
    () => scroll(text("one two three four five")).width(7).height(2),
    7,
    2,
  );
  expect(result.screen?.toString().split("\n")).toEqual(["one   █", "two"]);
});
test("minimums cause overflow rather than negative allocation", async () => {
  const rects: number[] = [];
  await render(
    () =>
      row(
        ...[0, 1].map(() =>
          box()
            .width("fill")
            .minWidth(8)
            .ref((ref) => {
              if (ref) rects.push(ref.rect.width);
            }),
        ),
      ),
    10,
    2,
  );
  expect(rects).toEqual([8, 8]);
});

test("fractional cell spacing is normalized before allocation and painting", async () => {
  const result = await render(
    () => row(text("a"), text("b")).gap(1.9).padding(1.9),
    8,
    4,
  );
  expect(result.screen?.toString().split("\n")[1]).toBe(" a b");
});

test("row height accounts for text wrapping after main-axis allocation", async () => {
  const result = await render(
    () =>
      column(
        row(
          text("abcdefgh").width("fill"),
          text("12345678").width("fill"),
        ).width(8),
        text("after"),
      ),
    12,
    5,
  );
  expect(result.screen?.toString().split("\n").slice(0, 3)).toEqual([
    "abcd1234",
    "efgh5678",
    "after",
  ]);
});
