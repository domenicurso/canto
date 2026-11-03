import { expect, test } from "bun:test";

import {
  column,
  createApp,
  input,
  keyEvent,
  MemoryTerminal,
  text,
  useState,
  useViewport,
} from "../../../index";

test.each(["fullscreen", "inline"] as const)(
  "%s sidebar reserves layout width and restores it without remounting or stealing focus",
  async (mode) => {
    const terminal = new MemoryTerminal(100, 35);
    const app = createApp(
      () => {
        const viewport = useViewport();
        const [count, setCount] = useState(0);
        return column(
          text(`Viewport ${viewport.width} count=${count}`),
          input({ defaultValue: "Draft" }).autoFocus(),
        )
          .fill()
          .background("#123456")
          .onKey((event) => {
            if (event.key === "r") setCount(count + 1);
          });
      },
      { terminal, mode },
    );
    const running = app.run();
    try {
      await Bun.sleep(0);
      terminal.dispatch({ type: "key", event: keyEvent("r") });
      app.debug.setVisible(true);
      app.debug.setPlacement("sidebar");
      await app.flush();
      expect(app.viewport.width).toBe(58);
      expect(terminal.screen?.width).toBe(100);
      expect(terminal.screen?.toString()).toContain("Viewport 58 count=1");
      expect(terminal.screen?.get(57, 30)?.style.background).toBe("#123456");
      expect(terminal.screen?.get(58, 30)?.style.background).not.toBe(
        "#123456",
      );
      app.debug.setVisible(false);
      await app.flush();
      expect(app.viewport.width).toBe(100);
      expect(terminal.screen?.toString()).toContain("Viewport 100 count=1");
      terminal.dispatch({ type: "key", event: keyEvent("X", { text: "X" }) });
      await app.flush();
      expect(terminal.screen?.toString()).toContain("DraftX");
    } finally {
      app.stop();
      await running;
    }
  },
);

test("sidebar placement falls back on small terminals and returns when room is available", async () => {
  const terminal = new MemoryTerminal(100, 35);
  const app = createApp(() => text(`width=${useViewport().width}`), {
    terminal,
  });
  const running = app.run();
  try {
    await Bun.sleep(0);
    app.debug.setVisible(true);
    app.debug.setPlacement("sidebar");
    await app.flush();
    terminal.resize(30, 10);
    await app.flush();
    expect(app.viewport.width).toBe(30);
    expect(app.debug.placement).toBe("sidebar");
    terminal.resize(100, 35);
    await app.flush();
    expect(app.viewport.width).toBe(58);
    expect(terminal.screen?.toString()).toContain("width=58");
    app.debug.setPlacement("overlay");
    await app.flush();
    expect(app.viewport.width).toBe(100);
  } finally {
    app.stop();
    await running;
  }
});
