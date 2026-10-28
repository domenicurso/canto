import {
  button,
  column,
  createApp,
  input,
  keyEvent,
  list,
  MemoryTerminal,
  scroll,
  style,
  text,
  useEffect,
  useState,
} from "../../index";
import { expect, test } from "bun:test";

test("disabled controls are skipped and keyboard activation calls onPress once", async () => {
  const terminal = new MemoryTerminal(20, 4);
  let presses = 0;
  const app = createApp(
    () =>
      column(
        button("disabled", {
          disabled: true,
          onPress: () => {
            presses += 100;
          },
        }),
        button("go", () => {
          presses++;
        }).focused(style().bold()),
      ),
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    terminal.dispatch({ type: "key", event: keyEvent("tab") });
    await app.flush();
    terminal.dispatch({ type: "key", event: keyEvent("enter") });
    await app.flush();
    expect(presses).toBe(1);
    expect(terminal.screen?.get(0, 1)?.style.bold).toBe(true);
  } finally {
    app.stop();
    await running;
  }
});
test("preventDefault intercepts editing and stopped events do not reach ancestors", async () => {
  const terminal = new MemoryTerminal();
  let bubbled = 0;
  const app = createApp(
    () =>
      column(
        input()
          .autoFocus()
          .onKey((event) => {
            event.preventDefault();
            event.stopPropagation();
          }),
      ).onKey(() => {
        bubbled++;
      }),
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    terminal.dispatch({ type: "key", event: keyEvent("a", { text: "a" }) });
    await app.flush();
    expect(bubbled).toBe(0);
    expect(terminal.screen?.toString().trim()).toBe("");
  } finally {
    app.stop();
    await running;
  }
});
test("two-axis controlled scrolling moves content on both axes", async () => {
  const terminal = new MemoryTerminal(5, 2);
  const app = createApp(
    () =>
      scroll(text("abcdef\nghijkl\nmnopqr"), {
        axis: "both",
        offset: { x: 2, y: 1 },
        onScroll: () => {},
        scrollbar: "hidden",
      }).fill(),
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    expect(terminal.screen?.toString()).toBe("hijkl\nnopqr");
  } finally {
    app.stop();
    await running;
  }
});
test("large lists mount only visible rows and scroll through the dataset", async () => {
  const terminal = new MemoryTerminal(30, 5);
  const items = Array.from({ length: 10000 }, (_, index) => index);
  let rendered = 0;
  const app = createApp(
    () =>
      list(items, {
        height: 5,
        itemHeight: 1,
        key: (item) => item,
        render: (item) => {
          rendered++;
          return text(`Item ${item}`);
        },
      }),
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    expect(rendered).toBeLessThan(10);
    terminal.dispatch({ type: "key", event: keyEvent("tab") });
    terminal.dispatch({ type: "key", event: keyEvent("pagedown") });
    await app.flush();
    await Bun.sleep(0);
    expect(terminal.screen?.toString()).toContain("Item 5");
    expect(rendered).toBeLessThan(30);
  } finally {
    app.stop();
    await running;
  }
});
test("setter identity is stable and every effect cleanup runs after a failure", async () => {
  const terminal = new MemoryTerminal();
  const setters: unknown[] = [];
  let update = (): void => {};
  let cleaned = false;
  const app = createApp(
    () => {
      const [count, setCount] = useState(0);
      setters.push(setCount);
      update = () => setCount(1);
      useEffect(
        () => () => {
          throw new Error("cleanup failure");
        },
        [],
      );
      useEffect(
        () => () => {
          cleaned = true;
        },
        [],
      );
      return text(count);
    },
    { terminal },
  );
  const running = app.run();
  await Bun.sleep(0);
  update();
  await app.flush();
  await Bun.sleep(0);
  app.stop();
  await expect(running).rejects.toThrow("cleanup");
  expect(setters[0]).toBe(setters[1]);
  expect(cleaned).toBe(true);
  expect(terminal.stopped).toBe(true);
});
