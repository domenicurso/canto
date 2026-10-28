import { expect, test } from "bun:test";

import { createApp, MemoryTerminal, scroll, text, useState } from "../../index";

test("offset-only updates translate content without measuring it again", async () => {
  const terminal = new MemoryTerminal(10, 3);
  let update = (_offset: number): void => {};
  const content = Array.from(
    { length: 100 },
    (_, index) => `row ${String(index).padStart(2, "0")}`,
  ).join("\n");
  const app = createApp(
    () => {
      const [offset, setOffset] = useState(0);
      update = setOffset;
      return scroll(text(content), {
        axis: "vertical",
        offset,
        onScroll: setOffset,
        scrollbar: "hidden",
      }).fill();
    },
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    update(20);
    await app.flush();
    expect(terminal.screen?.toString()).toBe("row 20\nrow 21\nrow 22");
    expect(app.stats.layoutTime).toBe(0);
    terminal.resize(10, 90);
    await app.flush();
    expect(terminal.screen?.toString().split("\n")[0]).toBe("row 10");
    update(0);
    await app.flush();
    expect(terminal.screen?.toString().split("\n")[0]).toBe("row 00");
    expect(app.stats.layoutTime).toBe(0);
  } finally {
    app.stop();
    await running;
  }
});
test("hidden scrollbars reserve no gutter and retain the full viewport", async () => {
  const terminal = new MemoryTerminal(4, 2);
  const app = createApp(
    () =>
      scroll(text("abcdefgh\nijklmnop\nqrstuvwx"), {
        axis: "both",
        scrollbar: "hidden",
        gutter: "stable",
      }).fill(),
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    expect(terminal.screen?.toString()).toBe("abcd\nijkl");
  } finally {
    app.stop();
    await running;
  }
});
