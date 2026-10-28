import { expect, test } from "bun:test";

import type { PointerEvent } from "../element/events";

import { text } from "../../index";
import { PointerClicks } from "./pointer-clicks";
import { mounted } from "./tree";

test("click sequences reset after timeout, drag, target change, or explicit clearing", () => {
  const clicks = new PointerClicks();
  const first = mounted(text("first"), null);
  const second = mounted(text("second"), null);
  const event: PointerEvent = {
    action: "press",
    x: 1,
    y: 0,
    button: 0,
    deltaY: 0,
  };
  expect(clicks.press(first, event, 0)).toBe(1);
  expect(clicks.press(first, event, 200)).toBe(2);
  expect(clicks.press(first, event, 400)).toBe(3);
  expect(clicks.press(first, event, 900)).toBe(1);
  expect(clicks.press(second, event, 950)).toBe(1);
  clicks.move({ ...event, action: "move", x: 5 });
  expect(clicks.press(second, event, 1000)).toBe(1);
  clicks.clear();
  expect(clicks.press(second, event, 1050)).toBe(1);
});
