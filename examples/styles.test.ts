import { expect, test } from "bun:test";

import type { Screen } from "../src/render/screen";

import { createApp, MemoryTerminal } from "../index";
import { Styles } from "./styles";

function verifyLayers(screen: Screen | undefined): void {
  if (!screen) throw new Error("The style example must present a frame.");
  const rows = screen.toString().split("\n");
  const back = rows.findIndex((line) => line.includes("Back layer: 100%"));
  const front = rows.findIndex((line) => line.includes("Front group: 50%"));
  const nested = rows.findIndex((line) => line.includes("Nested text: 25%"));
  expect(back).toBeGreaterThan(0);
  expect(front).toBe(back + 1);
  expect(nested).toBe(front + 1);
  const x = rows[front]?.indexOf("Front group: 50%") ?? -1;
  expect(x).toBeGreaterThan(0);
  expect(screen.get(2, back)?.style.foreground).toBe("#ffffff");
  expect(screen.get(x, front)?.style).toMatchObject({
    foreground: [143, 157, 197],
    background: [26, 68, 119],
  });
  expect(screen.get(x, nested)?.style).toMatchObject({
    foreground: [85, 113, 158],
    background: [26, 68, 119],
  });
  expect(rows.some((line) => line.includes("Tab changes focus"))).toBe(true);
}
test("the style example shows overlapping group and nested opacity within a standard terminal", async () => {
  const terminal = new MemoryTerminal(80, 24);
  const app = createApp(Styles, { terminal, mode: "inline" });
  const running = app.run();
  try {
    await Bun.sleep(0);
    verifyLayers(terminal.screen);
    terminal.resize(100, 30);
    await app.flush();
    verifyLayers(terminal.screen);
  } finally {
    app.stop();
    await running;
  }
});
