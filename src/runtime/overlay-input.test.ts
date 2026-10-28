import { expect, test } from "bun:test";

import type { App, ElementRef } from "../../index";

import {
  button,
  column,
  createApp,
  input,
  keyEvent,
  MemoryTerminal,
  overlay,
  text,
  useState,
} from "../../index";

async function session(
  check: (terminal: MemoryTerminal, app: App) => Promise<void>,
): Promise<void> {
  const terminal = new MemoryTerminal(40, 16);
  let anchor: ElementRef | null = null;
  const app = createApp(
    () => {
      const [open, setOpen] = useState(false);
      const [nested, setNested] = useState(false);
      const [count, setCount] = useState(0);
      return column(
        button(`Open ${count}`, () => setOpen(true))
          .autoFocus()
          .ref((ref) => {
            anchor = ref;
          }),
        button("Background", () => setCount((n) => n + 1)),
        open &&
          overlay({
            modal: true,
            onDismiss: () => setOpen(false),
            content: column(
              text("Dialog"),
              input({ defaultValue: "edit" }).autoFocus(),
              button("Nested", () => setNested(true)),
              button("Close", () => setOpen(false)),
              nested &&
                nestedOverlay(
                  () => setNested(false),
                  () => anchor?.rect,
                ),
            ),
          })
            .width(24)
            .height(8)
            .background("red"),
      ).height(3);
    },
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    await check(terminal, app);
  } finally {
    app.stop();
    await running;
  }
}
function key(terminal: MemoryTerminal, value: string, shift = false): void {
  terminal.dispatch({ type: "key", event: keyEvent(value, { shift }) });
}
test("modal overlays escape parent clipping, trap Tab, block background presses, and restore focus", async () => {
  await session(async (terminal, app) => {
    key(terminal, "enter");
    await app.flush();
    expect(terminal.screen?.toString()).toContain("Dialog");
    key(terminal, "tab", true);
    key(terminal, "enter");
    await app.flush();
    expect(terminal.screen?.toString()).not.toContain("Dialog");
    key(terminal, "enter");
    await app.flush();
    for (const action of ["press", "release"] as const)
      terminal.dispatch({
        type: "mouse",
        event: { action, x: 0, y: 1, button: 0, deltaY: 0 },
      });
    await app.flush();
    expect(terminal.screen?.toString()).toContain("Open 0");
    expect(terminal.screen?.toString()).not.toContain("Dialog");
    key(terminal, "enter");
    await app.flush();
    expect(terminal.screen?.toString()).toContain("Dialog");
  });
});
test("Escape closes only the topmost nested modal and restores the previous scope", async () => {
  await session(async (terminal, app) => {
    key(terminal, "enter");
    await app.flush();
    key(terminal, "tab");
    key(terminal, "enter");
    await app.flush();
    expect(terminal.screen?.toString()).toContain("Inner close");
    key(terminal, "escape");
    await app.flush();
    expect(terminal.screen?.toString()).not.toContain("Inner close");
    expect(terminal.screen?.toString()).toContain("Dialog");
    key(terminal, "escape");
    await app.flush();
    expect(terminal.screen?.toString()).not.toContain("Dialog");
    key(terminal, "enter");
    await app.flush();
    expect(terminal.screen?.toString()).toContain("Dialog");
  });
});
test("anchored popovers flip above the anchor and remain inside a resized viewport", async () => {
  const terminal = new MemoryTerminal(20, 10);
  let anchor: ElementRef | null = null;
  const app = createApp(
    () =>
      column(
        text("Anchor")
          .position("absolute")
          .left(17)
          .top(8)
          .ref((ref) => {
            anchor = ref;
          }),
        overlay({
          content: text("Popover"),
          anchor: () => anchor?.rect,
          placement: "bottom-end",
          offset: 1,
        })
          .width(9)
          .height(3)
          .background("green"),
      ).fill(),
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    await app.flush();
    expect(terminal.screen?.toString()).toContain("Popover");
    terminal.resize(12, 6);
    await app.flush();
    expect(terminal.screen?.toString()).toContain("Popover");
  } finally {
    app.stop();
    await running;
  }
});

function nestedOverlay(
  close: () => void,
  anchor: () => ElementRef["rect"] | undefined,
) {
  return overlay({
    modal: true,
    onDismiss: close,
    anchor,
    placement: "bottom-start",
    content: button("Inner close", close),
  })
    .width(16)
    .height(3)
    .background("blue");
}
