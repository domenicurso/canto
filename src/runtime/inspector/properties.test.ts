import { expect, test } from "bun:test";

import { column, createApp, MemoryTerminal, text } from "../../../index";
import { mounted } from "../components/tree";
import { displayValue, properties } from "./property-values";
import { PropertyRow } from "./property-view";

test("inspecting application state bounds cycles and collections without executing accessors", () => {
  let calls = 0;
  const state = {
    get value(): number {
      calls++;
      throw new Error("Must not run while inspecting.");
    },
    children: Array.from({ length: 20 }, (_, index) => index),
  };
  expect(displayValue(state)).toContain('value: "[accessor]"');
  expect(displayValue(state)).toContain("0, 1, 2, 3, 4, 5, …");
  expect(calls).toBe(0);
  expect(
    properties(state, (key) => key).find((line) => line.label === "value")
      ?.edit,
  ).toBeUndefined();
  const cycle: { child?: object } = {};
  cycle.child = cycle;
  expect(displayValue(cycle)).toContain("{…}");
});

test("the first property header starts flush while later sections get one separating row", async () => {
  const terminal = new MemoryTerminal(30, 5);
  const node = mounted(text("Selected"), null);
  const app = createApp(
    () =>
      column(
        PropertyRow({
          node,
          line: { label: "Geometry", section: true },
          width: 30,
          first: true,
          changed: () => {},
        }),
        PropertyRow({
          node,
          line: { label: "Constraints", section: true },
          width: 30,
          first: false,
          changed: () => {},
        }),
      ),
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    await app.flush();
    expect(terminal.screen?.toString().split("\n").slice(0, 3)).toEqual([
      "Geometry",
      "",
      "Constraints",
    ]);
  } finally {
    app.stop();
    await running;
  }
});
