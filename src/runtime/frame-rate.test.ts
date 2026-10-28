import { expect, test } from "bun:test";

import { FrameRate } from "./frame-rate";

test("FPS counts completed presentations and drops idle frames from its window", () => {
  const rate = new FrameRate();
  expect(rate.rate(0)).toBe(0);
  for (let time = 0; time < 1000; time += 20) rate.record(time);
  expect(rate.rate(1000)).toBe(49);
  rate.record(1000);
  expect(rate.rate(1001)).toBe(50);
  expect(rate.rate(2001)).toBe(0);
  expect(rate.rate(3000)).toBe(0);
});
