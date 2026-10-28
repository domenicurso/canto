import { expect, test } from "bun:test";

import type { Child, PointerEvent } from "../../index";

import {
  button,
  column,
  createApp,
  keyEvent,
  MemoryTerminal,
  row,
  text,
  textarea,
} from "../../index";

async function selection(
  view: () => Child,
  events: PointerEvent[],
): Promise<string> {
  const terminal = new MemoryTerminal(40, 10);
  const app = createApp(view, { terminal });
  const running = app.run();
  try {
    await Bun.sleep(0);
    for (const event of events) terminal.dispatch({ type: "mouse", event });
    terminal.dispatch({ type: "key", event: keyEvent("w", { alt: true }) });
    await app.flush();
    return terminal.clipboardText;
  } finally {
    app.stop();
    await running;
  }
}
function click(x: number, y: number, clicks: 1 | 2 | 3): PointerEvent[] {
  return (["press", "release"] as const).map((action) => ({
    action,
    x,
    y,
    clicks,
    button: 0,
    deltaY: 0,
  }));
}
function release(x: number, y: number): PointerEvent {
  return { action: "release", x, y, button: 0, deltaY: 0 };
}
test("double click selects a Unicode word and dragging extends by whole words in either direction", async () => {
  const view = () => text("one café 界 two");
  expect(await selection(view, click(5, 0, 2))).toBe("café");
  expect(
    await selection(view, [...click(5, 0, 2).slice(0, 1), release(13, 0)]),
  ).toBe("café 界 two");
  expect(
    await selection(view, [...click(5, 0, 2).slice(0, 1), release(0, 0)]),
  ).toBe("one café");
});
test("triple click selects a visual text row across siblings", async () => {
  expect(
    await selection(() => row(text("one"), text("two")).gap(2), click(1, 0, 3)),
  ).toBe("one two");
  expect(
    await selection(() => text("hello world").width(6), click(1, 1, 3)),
  ).toBe("world");
});
test("editor double and triple clicks select words and logical lines", async () => {
  const view = () =>
    textarea({ defaultValue: "one café\nsecond line" }).width(30).height(3);
  expect(await selection(view, click(5, 0, 2))).toBe("café");
  expect(await selection(view, click(2, 0, 3))).toBe("one café\n");
  expect(
    await selection(view, [...click(5, 0, 2).slice(0, 1), release(9, 1)]),
  ).toBe("café\nsecond line");
});
test("cross-element reverse dragging excludes button labels from copied text", async () => {
  expect(
    await selection(
      () =>
        column(
          text("first"),
          button("control", () => {}),
          text("last"),
        ),
      [...click(3, 2, 1).slice(0, 1), release(1, 0)],
    ),
  ).toBe("irst\nlast");
});
test("successive terminal presses produce double and triple clicks without adapter click counts", async () => {
  const events = click(5, 0, 1).map(({ clicks: _clicks, ...event }) => event);
  expect(
    await selection(() => text("one café two"), [...events, ...events]),
  ).toBe("café");
  expect(
    await selection(
      () => text("one café two"),
      [...events, ...events, ...events],
    ),
  ).toBe("one café two");
});
