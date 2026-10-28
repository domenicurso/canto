import { expect, test } from "bun:test";

import type { Element } from "../../index";

import { box, column, input, row, scroll, style, text } from "../../index";
import { flatten } from "../element/node";
import { layout } from "../layout/arrange";
import { resolveStyles } from "../layout/styles";
import { mounted, type Mounted } from "../runtime/tree";
import { ansi } from "./ansi";
import { paint } from "./paint";

function tree(element: Element, parent: Mounted | null = null): Mounted {
  const node = mounted(element, parent);
  node.children = flatten(element.data.children).map((child) =>
    tree(child, node),
  );
  return node;
}
function render(element: Element) {
  const root = tree(element);
  resolveStyles(root);
  const size = { width: 16, height: 8 };
  layout(root, size);
  return paint(root, size);
}
test("text attributes emit ANSI underline forms, colors, strike, inverse, and resets", () => {
  expect(
    ansi(
      style().underline("curly").underlineColor("red").strikethrough().inverse()
        .definition.base,
    ),
  ).toBe("\x1b[0;4:3;58;5;1;9;7m");
  for (const [form, code] of [
    ["single", 1],
    ["double", 2],
    ["dotted", 4],
    ["dashed", 5],
  ] as const)
    expect(ansi(style().underline(form).definition.base)).toContain(
      `4:${code}`,
    );
  expect(ansi(style().underlineColor("#123456").definition.base)).toContain(
    "58;2;18;52;86",
  );
  expect(
    ansi(
      style().underline(false).strikethrough(false).inverse(false).definition
        .base,
    ),
  ).toBe("\x1b[0m");
});
test("centered and right-aligned rich text preserve wrapping, wide glyphs, and inherited attributes", () => {
  const screen = render(
    column(
      text("界", text("ab").bold()).width(8),
      text("x").width(8).textAlign("right"),
    )
      .textAlign("center")
      .strikethrough(),
  );
  expect(screen.toString().split("\n").slice(0, 2)).toEqual([
    "  界ab",
    "       x",
  ]);
  expect(screen.get(4, 0)?.style).toMatchObject({
    bold: true,
    strikethrough: true,
  });
  const truncated = render(
    column(
      text("界abcd")
        .width(5)
        .wrap("none")
        .overflow("ellipsis")
        .textAlign("right"),
    ),
  );
  expect(truncated.toString().split("\n")[0]).toBe("界ab…");
});
test("axis gaps and side padding participate in measurement and allocation", () => {
  const screen = render(
    column(row(text("a"), text("b")).gap(5).columnGap(2), text("c"))
      .gap(5)
      .rowGap(1)
      .padding(1)
      .paddingTop(0)
      .paddingLeft(2),
  );
  expect(screen.toString().split("\n").slice(0, 3)).toEqual([
    "  a  b",
    "",
    "  c",
  ]);
  const reset = render(column(text("a").paddingLeft(5).padding(0)));
  expect(reset.toString().split("\n")[0]).toBe("a");
});
test("custom borders use separate edges and side colors, with top and bottom owning corners", () => {
  const screen = render(
    column(
      box(text("x"))
        .width(5)
        .height(3)
        .border({
          topLeft: "1",
          topRight: "2",
          bottomLeft: "3",
          bottomRight: "4",
          top: "-",
          bottom: "=",
          left: "[",
          right: "]",
        })
        .borderColor("white")
        .borderTopColor("red")
        .borderBottomColor("blue")
        .borderLeftColor("green")
        .borderRightColor(null),
    ),
  );
  expect(screen.toString().split("\n").slice(0, 3)).toEqual([
    "1---2",
    "[x  ]",
    "3===4",
  ]);
  expect(screen.get(0, 0)?.style.foreground).toBe("red");
  expect(screen.get(0, 1)?.style.foreground).toBe("green");
  expect(screen.get(4, 1)?.style.foreground).toBeNull();
  expect(screen.get(4, 2)?.style.foreground).toBe("blue");
});
test("placeholder and scrollbar parts style controls independently from content", () => {
  const screen = render(
    column(
      input({ placeholder: "Search" })
        .color("white")
        .placeholder(style().color("cyan").faint(false)),
      scroll(text("a\nb\nc\nd"), { scrollbar: "visible" })
        .width(4)
        .height(2)
        .color("green")
        .scrollbarThumb(style().color("red"))
        .scrollbarTrack(style().color("blue")),
    ),
  );
  expect(screen.get(0, 0)?.style).toMatchObject({
    foreground: "cyan",
    faint: false,
  });
  expect(screen.get(0, 1)?.style.foreground).toBe("green");
  expect(screen.get(3, 1)?.style).toMatchObject({
    foreground: "red",
    background: "blue",
  });
  expect(screen.get(3, 2)?.style.background).toBe("blue");
});

test("scrollbar part colors can explicitly reset to terminal defaults", () => {
  const screen = render(
    column(
      scroll(text("a\nb\nc\nd"), { scrollbar: "visible" })
        .width(4)
        .height(2)
        .color("green")
        .background("blue")
        .scrollbarThumb(style().color(null))
        .scrollbarTrack(style().color(null)),
    ),
  );
  expect(screen.get(3, 0)?.style).toMatchObject({
    foreground: null,
    background: null,
  });
});
