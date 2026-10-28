import { expect, test } from "bun:test";

import { style, text } from "../../index";

test("styles and elements are immutable and declarations merge left to right", () => {
  const panel = style().padding(1).color("red");
  const warning = panel.color("yellow");
  const base = text("Hello").use(panel);
  const changed = base.use(warning).padding(2);
  expect(panel.definition.base.foreground).toBe("red");
  expect(base.definition.base.padding).toBe(1);
  expect(changed.definition.base).toEqual({ padding: 2, foreground: "yellow" });
});
test("variant styles compose without modifying their source", () => {
  const a = style().focused(style().bold());
  const b = style().focused(style().color("cyan"));
  const merged = text("Hi").use(a, b);
  expect(merged.definition.variants.focused).toEqual({
    bold: true,
    foreground: "cyan",
  });
  expect(a.definition.variants.focused).toEqual({ bold: true });
});
