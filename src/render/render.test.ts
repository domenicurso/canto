import { expect, test } from "bun:test";

import { diff } from "./diff";
import { Screen } from "./screen";

const clip = { x: 0, y: 0, width: 10, height: 2 };
test("unchanged frames emit nothing and adjacent changes form a run", () => {
  const a = new Screen(10, 2);
  a.put(clip, "Hello", {}, clip);
  const first = diff(undefined, a);
  expect(first.output.match(/\x1b\[1;1H/g)).toHaveLength(1);
  expect(diff(a, a)).toEqual({ output: "", cellsWritten: 0 });
  expect(first.output).not.toContain("\x1b[2J");
});
test("replacing a wide character clears its continuation", () => {
  const a = new Screen(10, 2);
  a.put(clip, "🙂", {}, clip);
  const b = new Screen(10, 2);
  b.put(clip, "a", {}, clip);
  const result = diff(a, b);
  expect(result.output).toContain("a ");
});
test("partially clipped wide characters never spill outside their clip", () => {
  const a = new Screen(10, 2);
  a.put(clip, "🙂", {}, { ...clip, width: 1 });
  expect(a.toString().trim()).toBe("");
});
