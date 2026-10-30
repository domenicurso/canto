import { expect, test } from "bun:test";

import { graphemes, take, width } from "./columns";
import { wrap } from "./wrap";

test("wrapping preserves long words instead of replacing characters with hyphens", () => {
  expect(wrap("abcdefghij", 4)).toEqual(["abcd", "efgh", "ij"]);
  expect(wrap("one two three", 7)).toEqual(["one two", "three"]);
});
test("graphemes and wide characters share consistent measurement and clipping", () => {
  expect(graphemes("é🙂👨‍👩‍👧‍👦")).toHaveLength(3);
  expect(width("é界🙂")).toBe(5);
  expect(take("a🙂b", 2)).toBe("a");
  expect(wrap("🙂🙂a", 2, { wrap: "character" })).toEqual(["🙂", "🙂", "a"]);
});
test("ellipsis respects cell widths and max lines", () => {
  expect(wrap("abcdef", 4, { wrap: "none", overflow: "ellipsis" })).toEqual([
    "abc…",
  ]);
  expect(wrap("abcdefghij", 4, { maxLines: 1, overflow: "ellipsis" })).toEqual([
    "abc…",
  ]);
});

test("text symbols and emoji presentation use distinct cell widths", () => {
  expect(width("©❤")).toBe(2);
  expect(width("©️❤️")).toBe(4);
  expect(wrap("©❤", 2)).toEqual(["©❤"]);
  expect(take("©️x", 2)).toBe("©️");
  expect(width("\u0301\u200d")).toBe(0);
});
