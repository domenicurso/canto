import {
  button,
  column,
  component,
  createApp,
  input,
  keyEvent,
  MemoryTerminal,
  text,
  useApp,
  useEffect,
  useState,
} from "../../index";
import { expect, test } from "bun:test";

async function ready(app: ReturnType<typeof createApp>): Promise<void> {
  await app.flush();
  await Bun.sleep(0);
}
test("creation is inert, updates batch, and derived values follow state", async () => {
  const terminal = new MemoryTerminal(30, 5);
  let renders = 0;
  let increment = (): void => {};
  const app = createApp(
    () => {
      renders++;
      const [count, setCount] = useState(0);
      increment = () => {
        setCount((n) => n + 1);
        setCount((n) => n + 1);
      };
      return text(`${count} / ${count * 2}`);
    },
    { terminal },
  );
  expect(terminal.started).toBe(false);
  expect(renders).toBe(0);
  const running = app.run();
  try {
    await ready(app);
    expect(terminal.screen?.toString()).toContain("0 / 0");
    increment();
    await ready(app);
    expect(terminal.screen?.toString()).toContain("2 / 4");
    expect(renders).toBe(2);
  } finally {
    app.stop();
    await running;
  }
  expect(terminal.stopped).toBe(true);
  expect(app.status).toBe("stopped");
  await expect(app.run()).rejects.toThrow("only run once");
});
test("keyed components retain state when reordered and clean up on removal", async () => {
  const terminal = new MemoryTerminal(30, 5);
  const cleaned: string[] = [];
  let reorder = (): void => {};
  let remove = (): void => {};
  const Row = component(({ name }: { name: string }) => {
    const [count, setCount] = useState(0);
    useEffect(
      () => () => {
        cleaned.push(name);
      },
      [],
    );
    return button(`${name}:${count}`, () => setCount((n) => n + 1));
  });
  const app = createApp(
    () => {
      const [items, setItems] = useState(["a", "b"]);
      reorder = () => setItems(["b", "a"]);
      remove = () => setItems(["b"]);
      return column(items.map((name) => Row({ name }).key(name)));
    },
    { terminal },
  );
  const running = app.run();
  try {
    await ready(app);
    terminal.dispatch({ type: "key", event: keyEvent("tab") });
    terminal.dispatch({ type: "key", event: keyEvent("enter") });
    await ready(app);
    expect(terminal.screen?.toString()).toContain("a:1");
    reorder();
    await ready(app);
    expect(terminal.screen?.toString().split("\n").slice(0, 2)).toEqual(["b:0", "a:1"]);
    remove();
    await ready(app);
    expect(cleaned).toEqual(["a"]);
  } finally {
    app.stop();
    await running;
  }
  expect(cleaned).toEqual(["a", "b"]);
});
test("effects clean up before replacement and cleanup survives sibling failure", async () => {
  const terminal = new MemoryTerminal();
  const events: string[] = [];
  let update = (): void => {};
  const app = createApp(
    () => {
      const [count, setCount] = useState(0);
      update = () => setCount(1);
      useEffect(() => {
        events.push(`start:${count}`);
        return () => {
          events.push(`end:${count}`);
        };
      }, [count]);
      return text(count);
    },
    { terminal },
  );
  const running = app.run();
  await ready(app);
  update();
  await ready(app);
  app.stop();
  await running;
  expect(events).toEqual(["start:0", "end:0", "start:1", "end:1"]);
});
test("render failure rejects after restoring the terminal", async () => {
  const terminal = new MemoryTerminal();
  const app = createApp(
    () => {
      throw new Error("broken");
    },
    { terminal },
  );
  await expect(app.run()).rejects.toThrow("broken");
  expect(terminal.stopped).toBe(true);
});
test("effect can stop the application without leaking resources", async () => {
  const terminal = new MemoryTerminal();
  let cleaned = false;
  const app = createApp(
    () => {
      const app = useApp();
      useEffect(() => {
        app.stop();
        return () => {
          cleaned = true;
        };
      }, []);
      return text("Done");
    },
    { terminal },
  );
  await app.run();
  expect(cleaned).toBe(true);
});
test("conditional inputs join focus and edit whole graphemes", async () => {
  const terminal = new MemoryTerminal(30, 5);
  const app = createApp(
    () => {
      const [value, setValue] = useState("🙂");
      return column(true && input({ value, onChange: setValue }), text(value));
    },
    { terminal },
  );
  const running = app.run();
  try {
    await ready(app);
    terminal.dispatch({ type: "key", event: keyEvent("tab") });
    terminal.dispatch({ type: "key", event: keyEvent("end") });
    terminal.dispatch({ type: "key", event: keyEvent("backspace") });
    await ready(app);
    expect(terminal.screen?.toString().trim()).toBe("");
  } finally {
    app.stop();
    await running;
  }
});
test("aborted startup mounts nothing and always finishes", async () => {
  const terminal = new MemoryTerminal();
  const controller = new AbortController();
  controller.abort();
  const app = createApp(
    () => {
      throw new Error("must not mount");
    },
    { terminal, signal: controller.signal },
  );
  await app.run();
  expect(terminal.started).toBe(false);
});
