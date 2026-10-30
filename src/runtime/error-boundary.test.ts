import { expect, test } from "bun:test";

import {
  button,
  column,
  component,
  createApp,
  errorBoundary,
  keyEvent,
  MemoryTerminal,
  text,
  useEffect,
  useState,
} from "../../index";

test("render failures replace only their subtree and retry remounts clean state", async () => {
  const terminal = new MemoryTerminal(30, 6);
  let broken = false;
  let update = (): void => {};
  let reset = (): void => {};
  let cleanups = 0;
  const Pane = component(() => {
    const [count, setCount] = useState(0);
    update = () => setCount((value) => value + 1);
    useEffect(
      () => () => {
        cleanups++;
      },
      [],
    );
    if (broken) throw new Error("pane failed");
    return text(`Pane ${count}`);
  });
  const app = createApp(
    () =>
      column(
        text("Healthy"),
        errorBoundary(
          () => Pane(),
          (error, retry) => {
            reset = retry;
            return text("Retry pane");
          },
        ),
      ),
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    broken = true;
    update();
    await Bun.sleep(0);
    expect(terminal.screen?.toString()).toContain("Healthy\nRetry pane");
    expect(cleanups).toBe(1);
    broken = false;
    reset();
    await Bun.sleep(0);
    expect(terminal.screen?.toString()).toContain("Pane 0");
  } finally {
    app.stop();
    await running;
  }
  expect(cleanups).toBe(2);
});

test("effect and keyboard callback errors are recovered by the enclosing boundary", async () => {
  for (const phase of ["effect", "event"] as const) {
    const terminal = new MemoryTerminal(30, 5);
    const app = createApp(
      () =>
        column(
          text("Sibling"),
          errorBoundary(
            () => {
              useEffect(() => {
                if (phase === "effect") throw new Error("effect");
              }, []);
              return button("Break", () => {
                throw new Error("event");
              }).autoFocus();
            },
            (error) => text(error instanceof Error ? error.message : "unknown"),
          ),
        ),
      { terminal },
    );
    const running = app.run();
    try {
      await Bun.sleep(0);
      if (phase === "event")
        terminal.dispatch({ type: "key", event: keyEvent("enter") });
      await Bun.sleep(0);
      expect(app.status).toBe("running");
      expect(terminal.screen?.toString()).toContain(`Sibling\n${phase}`);
    } finally {
      app.stop();
      await running;
    }
  }
});

test("a failing fallback reaches the outer boundary and preserves the thrown value", async () => {
  const terminal = new MemoryTerminal();
  const cause = { message: "fallback failed" };
  const app = createApp(
    () =>
      errorBoundary(
        () =>
          errorBoundary(
            () => {
              throw new Error("inner");
            },
            () => {
              throw cause;
            },
          ),
        (error) => {
          expect(error).toBe(cause);
          const [label] = useState("Recovered");
          return text(label);
        },
      ),
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    expect(terminal.screen?.toString()).toContain("Recovered");
  } finally {
    app.stop();
    await running;
  }
});

test("unmount cleanup failures remain fatal and still restore the terminal", async () => {
  const terminal = new MemoryTerminal();
  const app = createApp(
    () =>
      errorBoundary(
        () => {
          useEffect(
            () => () => {
              throw new Error("cleanup failed");
            },
            [],
          );
          return text("Ready");
        },
        () => text("Fallback"),
      ),
    { terminal },
  );
  const running = app.run();
  await Bun.sleep(0);
  app.stop();
  await expect(running).rejects.toThrow("Component cleanup failed");
  expect(terminal.stopped).toBe(true);
});
