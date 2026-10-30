import { expect, test } from "bun:test";

import {
  column,
  createApp,
  keyEvent,
  list,
  MemoryTerminal,
  text,
  useState,
} from "../../index";

const items = Array.from({ length: 1000 }, (_, index) => index);
const itemHeight = (item: number): number => (item % 3) + 1;

test("variable rows navigate beyond the mounted window and resize with their parent", async () => {
  const terminal = new MemoryTerminal(30, 8);
  let rendered = 0;
  let selected = -1;
  const app = createApp(
    () =>
      column(
        text("Header"),
        list(items, {
          height: "fill",
          itemHeight,
          key: (item) => item,
          onActiveChange: (index) => {
            selected = index;
          },
          render: (item) => {
            rendered++;
            return text(`Item ${item}\nDetails ${item}`);
          },
        }),
      ).fill(),
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    expect(terminal.screen?.toString()).toContain("Details 1");
    expect(rendered).toBeLessThan(30);
    terminal.dispatch({ type: "key", event: keyEvent("tab") });
    terminal.dispatch({ type: "key", event: keyEvent("end") });
    await Bun.sleep(0);
    expect(selected).toBe(999);
    expect(terminal.screen?.toString()).toContain("Item 999");
    terminal.resize(30, 4);
    await Bun.sleep(0);
    expect(terminal.screen?.toString()).toContain("Item 999");
    terminal.dispatch({ type: "key", event: keyEvent("home") });
    await Bun.sleep(0);
    expect(terminal.screen?.toString()).toContain("Item 0");
    expect(rendered).toBeLessThan(100);
  } finally {
    app.stop();
    await running;
  }
});

test("controlled selection reveals rows and shortened datasets clamp the viewport", async () => {
  const terminal = new MemoryTerminal(30, 5);
  let shrink = (): void => {};
  const app = createApp(
    () => {
      const [values, setValues] = useState(items);
      const [active, setActive] = useState(999);
      shrink = () => {
        setValues([0, 1]);
        setActive(1);
      };
      return list(values, {
        height: 5,
        itemHeight,
        key: (item) => item,
        activeIndex: active,
        onActiveChange: setActive,
        render: (item) => text(`Row ${item}`),
      });
    },
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    expect(terminal.screen?.toString()).toContain("Row 999");
    shrink();
    await Bun.sleep(0);
    expect(terminal.screen?.toString()).toContain("Row 1");
    expect(terminal.screen?.toString()).not.toContain("Row 999");
  } finally {
    app.stop();
    await running;
  }
});

test("invalid variable heights reject after terminal cleanup", async () => {
  const terminal = new MemoryTerminal();
  const app = createApp(
    () =>
      list([1], {
        height: 5,
        itemHeight: () => 0,
        key: (item) => item,
        render: text,
      }),
    { terminal },
  );
  await expect(app.run()).rejects.toThrow("positive integer itemHeight");
  expect(terminal.stopped).toBe(true);
});
