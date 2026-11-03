import { expect, test } from "bun:test";

import { displayValue } from "./properties";

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
  const cycle: { child?: object } = {};
  cycle.child = cycle;
  expect(displayValue(cycle)).toContain("{…}");
});
