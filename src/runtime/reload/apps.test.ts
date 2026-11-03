import { expect, test } from "bun:test";

import {
  button,
  column,
  component,
  createApp,
  keyEvent,
  MemoryTerminal,
  text,
  useEffect,
  useMemo,
  useState,
} from "../../../index";

test("hot sessions retain root and explicitly identified child state and replace effects and memo closures", async () => {
  const terminal = new MemoryTerminal(60, 10);
  const events: string[] = [];
  const view = (label: string) => {
    const Child = component(
      () => {
        const [count, setCount] = useState(0);
        return button(`${label} child=${count}`, () =>
          setCount(count + 1),
        ).autoFocus();
      },
      { hot: "hot-test#child" },
    );
    return () => {
      const [count, setCount] = useState(0);
      const memo = useMemo(() => label, []);
      useEffect(() => {
        events.push(`start ${label}`);
        return () => {
          events.push(`stop ${label}`);
        };
      }, []);
      return column(text(`${memo} root=${count}`), Child()).onKey((event) => {
        if (event.key === "r") setCount(count + 1);
      });
    };
  };
  const app = createApp(view("one"), { terminal, hot: "hot-test" });
  const running = app.run();
  try {
    await Bun.sleep(0);
    terminal.dispatch({ type: "key", event: keyEvent("enter") });
    terminal.dispatch({ type: "key", event: keyEvent("r") });
    await app.flush();
    const reloaded = createApp(view("two"), { hot: "hot-test" });
    expect(reloaded).toBe(app);
    expect(reloaded.run()).toBe(running);
    await app.flush();
    expect(terminal.screen?.toString()).toContain("two root=1");
    expect(terminal.screen?.toString()).toContain("two child=1");
    expect(events).toEqual(["start one", "stop one", "start two"]);
  } finally {
    app.stop();
    await running;
  }
  expect(events.at(-1)).toBe("stop two");
});

test("incompatible hot hook signatures remount with cleanup and discard stale setters", async () => {
  const terminal = new MemoryTerminal(60, 10);
  let stale = (_value: number): void => {};
  let cleaned = 0;
  const app = createApp(
    () => {
      const [count, setCount] = useState(7);
      stale = setCount;
      useEffect(
        () => () => {
          cleaned++;
        },
        [],
      );
      return text(`Old ${count}`);
    },
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    app.update(() => {
      useMemo(() => "new", []);
      const [count] = useState(3);
      return text(`New ${count}`);
    });
    await app.flush();
    expect(cleaned).toBe(1);
    expect(terminal.screen?.toString()).toContain("New 3");
    stale(100);
    await app.flush();
    expect(terminal.screen?.toString()).toContain("New 3");
  } finally {
    app.stop();
    await running;
  }
});

test("adding or removing hooks on update remounts while ordinary conditional hooks remain errors", async () => {
  const terminal = new MemoryTerminal(60, 10);
  const app = createApp(
    () => {
      useState(7);
      return text("Initial");
    },
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    app.update(() => {
      const [count] = useState(2);
      useState(9);
      return text(`Added ${count}`);
    });
    await app.flush();
    expect(terminal.screen?.toString()).toContain("Added 2");
    app.update(() => text("Removed"));
    await app.flush();
    expect(terminal.screen?.toString()).toContain("Removed");
  } finally {
    app.stop();
    await running;
  }
  expect(() => app.update(() => text("Stopped"))).toThrow("stopped");
});
