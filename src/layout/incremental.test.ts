import { expect, test } from "bun:test";

import {
  column,
  createApp,
  MemoryTerminal,
  row,
  text,
  useState,
} from "../../index";

test("geometry changes remeasure affected ancestors while retaining an unchanged sibling subtree", async () => {
  const terminal = new MemoryTerminal(80, 24);
  let change = (_value: string): void => {};
  const app = createApp(
    () => {
      const [value, setValue] = useState("small");
      change = setValue;
      return row(
        column(text(value)).width(40).height("fill"),
        column(Array.from({ length: 20 }, (_, i) => text(`fixed ${i}`)))
          .width(40)
          .height("fill"),
      ).fill();
    },
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    const initialNodes = app.stats.layoutNodes ?? 0;
    change("a longer label\nwith another line");
    await app.flush();
    expect(app.stats.layoutTime).toBeGreaterThan(0);
    expect(app.stats.layoutNodes).toBeLessThan(initialNodes / 2);
    expect(terminal.screen?.toString()).toContain("another line");
    expect(terminal.screen?.toString()).toContain("fixed 19");
    terminal.resize(30, 12);
    await app.flush();
    terminal.resize(80, 24);
    await app.flush();
    expect(terminal.screen?.toString()).toContain("fixed 19");
  } finally {
    app.stop();
    await running;
  }
});
