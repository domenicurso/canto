import { expect, test } from "bun:test";

import type { App, Clipboard } from "../../index";

import { createApp, input, keyEvent, MemoryTerminal } from "../../index";
import { clipboardOutput } from "../terminal/clipboard";

async function session(
  clipboard: Clipboard | undefined,
  check: (terminal: MemoryTerminal, app: App) => Promise<void>,
) {
  const terminal = new MemoryTerminal(20, 4);
  const app = createApp(
    () => input({ defaultValue: "hello world" }).autoFocus(),
    { terminal, clipboard },
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
function key(terminal: MemoryTerminal, name: string) {
  terminal.dispatch({ type: "key", event: keyEvent(name, { ctrl: true }) });
}
test("copy, cut, and paste share the adapter and normalize inserted text", async () => {
  await session(undefined, async (terminal, app) => {
    key(terminal, "a");
    key(terminal, "insert");
    await Bun.sleep(0);
    expect(terminal.clipboardText).toBe("hello world");
    key(terminal, "x");
    await Bun.sleep(0);
    await app.flush();
    expect(terminal.screen?.toString().trim()).toBe("");
    await app.clipboard.writeText("new\ntext\x1b[31m");
    key(terminal, "v");
    await Bun.sleep(0);
    await app.flush();
    expect(terminal.screen?.toString().trim()).toBe("new text[31m");
  });
});
test("delayed paste does not overwrite newer edits or write to an unmounted editor", async () => {
  let finish: ((value: string) => void) | undefined;
  const clipboard: Clipboard = {
    writeText: async () => {},
    readText: () =>
      new Promise<string>((resolve) => {
        finish = resolve;
      }),
  };
  await session(clipboard, async (terminal, app) => {
    key(terminal, "v");
    await Bun.sleep(0);
    terminal.dispatch({ type: "key", event: keyEvent("!", { text: "!" }) });
    await app.flush();
    finish?.("stale");
    await Bun.sleep(0);
    await app.flush();
    expect(terminal.screen?.toString()).toContain("!hello world");
    key(terminal, "v");
    await Bun.sleep(0);
    app.stop();
  });
  finish?.("after stop");
  await Bun.sleep(0);
});
test("clipboard failure rejects run after restoring the terminal", async () => {
  const terminal = new MemoryTerminal();
  const cause = new Error("clipboard write failed");
  const app = createApp(() => input({ defaultValue: "value" }).autoFocus(), {
    terminal,
    clipboard: {
      writeText: async () => {
        throw cause;
      },
    },
  });
  const running = app.run();
  const rejected = running.then(
    () => undefined,
    (error: unknown) => error,
  );
  await Bun.sleep(0);
  key(terminal, "a");
  key(terminal, "insert");
  expect(await rejected).toBe(cause);
  expect(terminal.stopped).toBe(true);
});
test("OSC 52 encodes arbitrary UTF-8 and control bytes as clipboard payload", () => {
  const value = "界\x1b]52;c;injection\x07";
  expect(clipboardOutput(value)).toBe(
    `\x1b]52;c;${Buffer.from(value).toString("base64")}\x1b\\`,
  );
});

test("an editor can intercept clipboard shortcuts before their default action", async () => {
  const terminal = new MemoryTerminal();
  const app = createApp(
    () =>
      input({ defaultValue: "protected" })
        .autoFocus()
        .onKey((event) => {
          if (event.ctrl && event.key === "insert") event.preventDefault();
        }),
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    key(terminal, "a");
    key(terminal, "insert");
    await Bun.sleep(0);
    expect(terminal.clipboardText).toBe("");
  } finally {
    app.stop();
    await running;
  }
});
test("read-only editors permit copying but reject cut and paste", async () => {
  const terminal = new MemoryTerminal();
  const app = createApp(
    () => input({ defaultValue: "read only", readOnly: true }).autoFocus(),
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    key(terminal, "a");
    key(terminal, "insert");
    await Bun.sleep(0);
    expect(terminal.clipboardText).toBe("read only");
    key(terminal, "x");
    terminal.clipboardText = "replacement";
    key(terminal, "v");
    await Bun.sleep(0);
    await app.flush();
    expect(terminal.screen?.toString()).toContain("read only");
  } finally {
    app.stop();
    await running;
  }
});
