import { createApp, input, keyEvent, MemoryTerminal, textarea } from "../../index";
import { expect, test } from "bun:test";

test("selection replaces whole graphemes and supports controlled-independent input", async () => {
  const terminal = new MemoryTerminal(12, 3);
  let value = "";
  const app = createApp(
    () =>
      input({
        defaultValue: "é🙂",
        onChange: (next) => {
          value = next;
        },
      }).autoFocus(),
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    terminal.dispatch({ type: "key", event: keyEvent("a", { ctrl: true }) });
    terminal.dispatch({ type: "key", event: keyEvent("x", { text: "x" }) });
    await app.flush();
    await Bun.sleep(0);
    expect(value).toBe("x");
    expect(terminal.screen?.toString().trim()).toBe("x");
  } finally {
    app.stop();
    await running;
  }
});
test("multiline cursor navigation uses display columns and keeps the caret visible", async () => {
  const terminal = new MemoryTerminal(10, 2);
  const app = createApp(() => textarea({ defaultValue: "abc\ndef\nghi\njkl" }).fill().autoFocus(), {
    terminal,
  });
  const running = app.run();
  try {
    await Bun.sleep(0);
    terminal.dispatch({ type: "key", event: keyEvent("e", { ctrl: true }) });
    await app.flush();
    await Bun.sleep(0);
    expect(terminal.screen?.toString()).toBe("ghi\njkl");
    expect(terminal.output.at(-1)).toContain("\x1b[2;4H\x1b[?25h");
    terminal.dispatch({ type: "key", event: keyEvent("up") });
    terminal.dispatch({ type: "key", event: keyEvent("backspace") });
    await app.flush();
    await Bun.sleep(0);
    expect(terminal.screen?.toString()).toContain("gh");
  } finally {
    app.stop();
    await running;
  }
});
