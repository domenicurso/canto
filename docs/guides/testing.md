# Testing applications

[Documentation](../README.md) · [Terminal API](../api/terminal.md)

Inject `MemoryTerminal` to render without acquiring the process terminal. Drive the same events used by real input and assert visible content, focus behavior, or your application's state transitions. Tests can inspect cell styles with `screen.get(x, y)` when appearance matters.

## An interaction test

Save this as `examples/counter.test.ts` in the checkout and run `bun test examples/counter.test.ts`:

```ts
import { expect, test } from "bun:test";

import {
  button,
  createApp,
  keyEvent,
  MemoryTerminal,
  useState,
} from "../index";

test("Enter increments the focused counter", async () => {
  const terminal = new MemoryTerminal(30, 5);
  const app = createApp(
    () => {
      const [count, setCount] = useState(0);
      return button(`Count: ${count}`, () =>
        setCount((n) => n + 1),
      ).autoFocus();
    },
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    await app.flush();
    expect(terminal.screen?.toString()).toContain("Count: 0");
    terminal.dispatch({ type: "key", event: keyEvent("enter") });
    await app.flush();
    expect(terminal.screen?.toString()).toContain("Count: 1");
  } finally {
    app.stop();
    await running;
  }
  expect(terminal.stopped).toBe(true);
});
```

`run()` starts asynchronously; yielding once allows adapter startup before flushing. `flush()` awaits the current frame, while effects may schedule a subsequent one. If a test depends on an effect-driven update, allow that update to occur and flush again. Always stop in `finally` and await `running` so a failed assertion doesn't retain the session.

## Other boundaries to exercise

- Call `terminal.resize(width, height)` and flush to verify responsive composition at small sizes.
- Dispatch `{ type: "mouse", event: { x, y, action: "press", button: 0, deltaY: 0 } }`, followed by a release, to exercise pointer activation in viewport cell coordinates.
- Inspect `terminal.clipboardText` after copy shortcuts to test Unicode clipboard content without accessing the host clipboard.
- Assert `run()` rejection and `terminal.stopped` for application failures to verify cleanup.

The adapter retains all `frames` and raw `output` strings, and `screen` is its most recent frame. Long-running tests should account for that retention. See [runtime tests](../../src/runtime/app.test.ts) for state identity, cleanup, and failure examples.

## What headless tests establish

The library suite also uses a headless terminal emulator and POSIX PTYs. Those cover protocol output and restoration, but don't establish trackpad feel, terminal clipboard permissions, or display latency. Follow the [manual terminal checks](../contributing.md#terminal-verification) when changing input or output protocols.
