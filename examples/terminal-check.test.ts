import { expect, test } from "bun:test";

import { createApp, keyEvent, MemoryTerminal } from "../index";
import { Decoder } from "../src/terminal/decoder";
import { TerminalCheck, type TerminalChecks } from "./terminal-check";

test("the terminal checklist records observed results and confirms injected clipboard paste", async () => {
  const terminal = new MemoryTerminal(80, 24);
  let checks: TerminalChecks | undefined;
  let copied = "";
  const app = createApp(
    () =>
      TerminalCheck({
        onChange: (value) => {
          checks = value;
        },
      }),
    {
      terminal,
      debug: false,
      clipboard: {
        writeText: async (value) => {
          copied = value;
        },
      },
    },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    expect(checks?.unicode).toBe("unverified");
    for (const action of ["press", "release"] as const)
      terminal.dispatch({
        type: "mouse",
        event: { action, x: 1, y: 9, button: 0, deltaY: 0 },
      });
    await Bun.sleep(0);
    expect(checks?.pointer).toBe("pass");
    terminal.dispatch({ type: "key", event: keyEvent("tab") });
    terminal.dispatch({ type: "key", event: keyEvent("enter") });
    await Bun.sleep(0);
    expect(copied).toBe("Canto clipboard check");
    terminal.dispatch({ type: "key", event: keyEvent("tab") });
    terminal.dispatch({
      type: "key",
      event: keyEvent("paste", { text: copied }),
    });
    await Bun.sleep(0);
    expect(checks?.clipboard).toBe("pass");
    expect(checks?.colors).toBe("unverified");
  } finally {
    app.stop();
    await running;
  }
});

test("the checklist CLI rejects invalid modes without acquiring the terminal", async () => {
  const child = Bun.spawn(
    [process.execPath, "examples/terminal-check.ts", "invalid"],
    {
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const [code, output, error] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  expect(code).not.toBe(0);
  expect(error).toContain("Usage:");
  expect(output).not.toContain("\x1b[?1049h");
});

test("the checklist observes and displays modifier events decoded from terminal bytes", async () => {
  const terminal = new MemoryTerminal(80, 24);
  const observed: string[] = [];
  const app = createApp(
    () =>
      TerminalCheck({
        onChange: () => {},
        onKey: ({ key, ctrl, alt, shift }) =>
          observed.push(`${key}:${ctrl}:${alt}:${shift}`),
      }),
    { terminal, debug: false },
  );
  const running = app.run();
  const decoder = new Decoder((event) => terminal.dispatch(event));
  try {
    await Bun.sleep(0);
    decoder.push(Buffer.from("\x1b[1;5C\x1b[98;4u"));
    await app.flush();
    expect(observed).toEqual(["right:true:false:false", "b:false:true:true"]);
    expect(terminal.screen?.toString()).toContain("Alt+Shift+b");
  } finally {
    app.stop();
    await running;
  }
});
