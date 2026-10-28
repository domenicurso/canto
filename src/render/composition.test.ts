import { box, canvas, createApp, MemoryTerminal, text } from "../../index";
import { expect, test } from "bun:test";

test("mixed text styles wrap as one paragraph over a parent background", async () => {
  const terminal = new MemoryTerminal(10, 4);
  const app = createApp(
    () =>
      box(text("Hello ", text("world").bold().color("cyan")))
        .background("blue")
        .width(8),
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    expect(terminal.screen?.toString().split("\n").slice(0, 2)).toEqual(["Hello", "world"]);
    expect(terminal.screen?.get(0, 1)?.style.bold).toBe(true);
    expect(terminal.screen?.get(0, 1)?.style.background).toBe("blue");
  } finally {
    app.stop();
    await running;
  }
});
test("custom drawing uses the same clipping and styles as built-in elements", async () => {
  const terminal = new MemoryTerminal(6, 3);
  const app = createApp(
    () =>
      canvas((draw) => {
        draw.fill({ x: 0, y: 0, width: 10, height: 10 }, { background: "red" });
        draw.write(0, 0, "abcdefghi", { foreground: "green" });
      })
        .width(4)
        .height(1),
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    expect(terminal.screen?.toString().split("\n")[0]).toBe("abcd");
    expect(terminal.screen?.get(4, 0)?.style.background).toBeUndefined();
  } finally {
    app.stop();
    await running;
  }
});

test("ellipsis is drawn for plain and mixed-style paragraphs", async () => {
  const terminal = new MemoryTerminal(4, 2);
  const app = createApp(
    () => text("ab", text("cdef").bold()).width(4).wrap("none").overflow("ellipsis"),
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    expect(terminal.screen?.toString().split("\n")[0]).toBe("abc…");
  } finally {
    app.stop();
    await running;
  }
});
