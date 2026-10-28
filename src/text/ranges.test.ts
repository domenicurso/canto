import { expect, test } from "bun:test";

import {
  lineRange,
  paragraphBoundary,
  selectionRange,
  wordBoundary,
} from "./ranges";

test("word ranges and boundaries preserve Unicode combining characters and punctuation", () => {
  expect(selectionRange("a café!", 4, "word")).toEqual([2, 6]);
  expect(selectionRange("é🙂", 1, "character")).toEqual([0, 2]);
  expect(selectionRange("word!", 4, "word")).toEqual([4, 5]);
  expect(wordBoundary("one two", 3, 1)).toBe(7);
  expect(wordBoundary("one two", 7, -1)).toBe(4);
  expect(wordBoundary("", 0, -1)).toBe(0);
});
test("line and paragraph boundaries include real newlines and handle empty leading lines", () => {
  expect(lineRange("\nabc\n", 0)).toEqual([0, 1]);
  expect(lineRange("\nabc\n", 1)).toEqual([1, 5]);
  expect(selectionRange("a\nb", 2, "line")).toEqual([2, 3]);
  expect(paragraphBoundary("a\n \nb\n\nc", 0, 1)).toBe(4);
  expect(paragraphBoundary("a\n \nb\n\nc", 4, -1)).toBe(0);
  expect(paragraphBoundary("a\n \nb\n\nc", 4, 1)).toBe(7);
});
