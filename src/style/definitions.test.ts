import { expect, test } from "bun:test";

import { style, text } from "../../index";
import { partStyle, selectionStyle } from "../layout/style-parts";
import { resolveStyles } from "../layout/styles";
import { mounted } from "../runtime/tree";

test("nested interactions require every state and compose without mutating reusable styles", () => {
  const combined = style().hovered(style().focused(style().color("red")));
  const node = mounted(
    text("x").use(combined).focused(style().color("blue")),
    null,
  );
  node.focused = true;
  resolveStyles(node);
  expect(node.style.foreground).toBe("blue");
  node.hovered = true;
  resolveStyles(node);
  expect(node.style.foreground).toBe("red");
  const extended = combined.hovered(style().focused(style().bold()));
  expect(combined.definition.compounds).toHaveLength(1);
  node.element = text("x").use(extended);
  resolveStyles(node);
  expect(node.style).toMatchObject({ foreground: "red", bold: true });
});
test("specificity precedes declaration order and repeated state nesting is idempotent", () => {
  const node = mounted(
    text("x")
      .hovered(style().focused(style().pressed(style().color("green"))))
      .focused(style().hovered(style().color("red")))
      .hovered(style().hovered(style().italic())),
    null,
  );
  node.hovered = node.focused = node.pressed = true;
  resolveStyles(node);
  expect(node.style).toMatchObject({ foreground: "green", italic: true });
  node.pressed = false;
  resolveStyles(node);
  expect(node.style.foreground).toBe("red");
});
test("control parts merge and retain conditions from outer and inner interactions", () => {
  const node = mounted(
    text("x")
      .placeholder(style().color("gray"))
      .use(style().placeholder(style().italic()))
      .focused(style().placeholder(style().hovered(style().color("cyan")))),
    null,
  );
  node.focused = true;
  expect(partStyle(node, "placeholder")).toEqual({
    foreground: "gray",
    italic: true,
  });
  node.hovered = true;
  expect(partStyle(node, "placeholder")).toEqual({
    foreground: "cyan",
    italic: true,
  });
});
test("selection combines with focus without replacing unrelated text attributes", () => {
  const node = mounted(
    text("x")
      .bold()
      .selected(style().background("blue"))
      .focused(style().selected(style().color("yellow"))),
    null,
  );
  expect(selectionStyle(node)).toEqual({ background: "blue" });
  node.focused = true;
  expect(selectionStyle(node)).toEqual({
    background: "blue",
    foreground: "yellow",
  });
});

test("invalid opacity, spacing, translation, and border glyphs fail at style resolution", () => {
  for (const value of [
    style().opacity(-0.1),
    style().opacity(1.1),
    style().opacity(NaN),
    style().columnGap(-1),
    style().paddingLeft(-1),
    style().translate(Infinity, 0),
  ]) {
    expect(() => resolveStyles(mounted(text("x").use(value), null))).toThrow();
  }
  const glyphs = {
    topLeft: "+",
    topRight: "+",
    bottomLeft: "+",
    bottomRight: "+",
    top: "-",
    bottom: "-",
    left: "|",
    right: "界",
  };
  expect(() => resolveStyles(mounted(text("x").border(glyphs), null))).toThrow(
    "one terminal cell",
  );
});
