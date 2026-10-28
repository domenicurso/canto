import { expect, test } from "bun:test";

import { createApp, MemoryTerminal, scroll, text } from "../../index";

async function renderBar(axis: "horizontal" | "vertical", offset: number) {
  const terminal = new MemoryTerminal(
    axis === "horizontal" ? 8 : 2,
    axis === "horizontal" ? 2 : 8,
  );
  const content =
    axis === "horizontal"
      ? "x".repeat(32)
      : Array.from({ length: 32 }, () => "x").join("\n");
  const app = createApp(
    () =>
      scroll(text(content), {
        axis,
        defaultOffset: offset,
        scrollbar: "visible",
      })
        .fill()
        .color("white")
        .background("black"),
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
  } finally {
    app.stop();
    await running;
  }
  return Array.from({ length: 8 }, (_, index) =>
    terminal.screen?.get(
      axis === "horizontal" ? index : 1,
      axis === "horizontal" ? 1 : index,
    ),
  );
}
test("horizontal thumb edges use eighth blocks and invert colors at the leading edge", async () => {
  const cells = await renderBar("horizontal", 1);
  expect(cells.map((cell) => cell?.text).join("")).toBe("▎█▎     ");
  expect(cells[0]?.style).toMatchObject({
    foreground: "black",
    background: "white",
  });
  expect(cells[2]?.style).toMatchObject({
    foreground: "white",
    background: "black",
  });
});
test("vertical thumb edges use lower eighth blocks and invert colors at the trailing edge", async () => {
  const cells = await renderBar("vertical", 1);
  expect(cells.map((cell) => cell?.text).join("")).toBe("▆█▆     ");
  expect(cells[0]?.style).toMatchObject({
    foreground: "white",
    background: "black",
  });
  expect(cells[2]?.style).toMatchObject({
    foreground: "black",
    background: "white",
  });
});
test.each(["vertical", "horizontal"] as const)(
  "%s thumb aligns exactly at both endpoints",
  async (axis) => {
    const start = await renderBar(axis, 0);
    const end = await renderBar(axis, 24);
    expect(start.map((cell) => cell?.text).join("")).toBe("██      ");
    expect(end.map((cell) => cell?.text).join("")).toBe("      ██");
  },
);
