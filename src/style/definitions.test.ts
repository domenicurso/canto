import { expect, test } from "bun:test";

import { style, text } from "../../index";
import { partStyle, selectionStyle } from "../layout/styling/parts";
import { resolveStyles } from "../layout/styling/resolve";
import { mounted } from "../runtime/components/tree";

test("nested interactions require every state and compose without mutating reusable styles", () => {
  const combined = style().hovered(style().focused(style().color("red")));
  const node = mounted(
    text("x").use(combined).focused(style().color("blue")),
    null,
  );
  node.interaction.focused = true;
  resolveStyles(node);
  expect(node.layout.style.foreground).toBe("blue");
  node.interaction.hovered = true;
  resolveStyles(node);
  expect(node.layout.style.foreground).toBe("red");
  const extended = combined.hovered(style().focused(style().bold()));
  expect(combined.definition.compounds).toHaveLength(1);
  node.element = text("x").use(extended);
  resolveStyles(node);
  expect(node.layout.style).toMatchObject({ foreground: "red", bold: true });
});
test("specificity precedes declaration order and repeated state nesting is idempotent", () => {
  const node = mounted(
    text("x")
      .hovered(style().focused(style().pressed(style().color("green"))))
      .focused(style().hovered(style().color("red")))
      .hovered(style().hovered(style().italic())),
    null,
  );
  node.interaction.hovered =
    node.interaction.focused =
    node.interaction.pressed =
      true;
  resolveStyles(node);
  expect(node.layout.style).toMatchObject({
    foreground: "green",
    italic: true,
  });
  node.interaction.pressed = false;
  resolveStyles(node);
  expect(node.layout.style.foreground).toBe("red");
});
test("control parts merge and retain conditions from outer and inner interactions", () => {
  const node = mounted(
    text("x")
      .placeholder(style().color("gray"))
      .use(style().placeholder(style().italic()))
      .focused(style().placeholder(style().hovered(style().color("cyan")))),
    null,
  );
  node.interaction.focused = true;
  expect(partStyle(node, "placeholder")).toEqual({
    foreground: "gray",
    italic: true,
  });
  node.interaction.hovered = true;
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
  node.interaction.focused = true;
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
