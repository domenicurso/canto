import { expect, test } from "bun:test";

import type { Child } from "../../index";

import {
  button,
  column,
  createApp,
  input,
  keyEvent,
  MemoryTerminal,
  text,
  useState,
} from "../../index";

async function selected(
  view: () => Child,
  start: number,
  end: number,
): Promise<string> {
  const terminal = new MemoryTerminal(30, 6);
  const app = createApp(view, { terminal });
  const running = app.run();
  try {
    await Bun.sleep(0);
    terminal.dispatch({
      type: "mouse",
      event: { action: "press", x: 0, y: start, button: 0, deltaY: 0 },
    });
    terminal.dispatch({
      type: "mouse",
      event: { action: "release", x: 20, y: end, button: 0, deltaY: 0 },
    });
    terminal.dispatch({ type: "key", event: keyEvent("w", { alt: true }) });
    await app.flush();
    return terminal.clipboardText;
  } finally {
    app.stop();
    await running;
  }
}
test("text and labels are not selectable by default, even beside selectable content", async () => {
  expect(await selected(() => text("label"), 0, 0)).toBe("");
  expect(
    await selected(
      () => column(text("label"), text("content").selectable()),
      0,
      1,
    ),
  ).toBe("");
  expect(await selected(() => text("content").selectable(), 0, 0)).toBe(
    "content",
  );
});
test("selection regions inherit, children can opt out or opt back in, and button labels remain controls", async () => {
  expect(
    await selected(
      () =>
        column(
          text("first"),
          text("label").selectable(false),
          button("button", () => {}).selectable(),
          text("last"),
        ).selectable(),
      0,
      3,
    ),
  ).toBe("first\nlast");
  expect(
    await selected(
      () =>
        column(text("label"), text("content").selectable()).selectable(false),
      1,
      1,
    ),
  ).toBe("content");
});
test("editor selection is built in even within non-selectable chrome", async () => {
  expect(
    await selected(
      () => input({ defaultValue: "editable" }).selectable(false),
      0,
      0,
    ),
  ).toBe("editable");
});
test("turning off selection on an existing content region clears its highlight and copied text", async () => {
  let disable = (): void => {};
  const terminal = new MemoryTerminal(30, 6);
  const app = createApp(
    () => {
      const [enabled, setEnabled] = useState(true);
      disable = () => setEnabled(false);
      return text("content").selectable(enabled);
    },
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    for (const [action, x] of [
      ["press", 0],
      ["release", 5],
    ] as const)
      terminal.dispatch({
        type: "mouse",
        event: { action, x, y: 0, button: 0, deltaY: 0 },
      });
    await app.flush();
    expect(terminal.screen?.get(0, 0)?.style.background).toBe("brightWhite");
    disable();
    await app.flush();
    expect(terminal.screen?.get(0, 0)?.style.background).toBeUndefined();
    terminal.dispatch({ type: "key", event: keyEvent("w", { alt: true }) });
    await app.flush();
    expect(terminal.clipboardText).toBe("");
  } finally {
    app.stop();
    await running;
  }
});
