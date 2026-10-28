import { expect, test } from "bun:test";

import { column, overlay, row, scroll, text } from "../../index";
import { layout, invalidateLayout } from "../layout/arrange";
import { LayoutInvalidation } from "../layout/invalidation";
import { repositionScroll } from "../layout/scroll";
import { resolveStyles } from "../layout/styles";
import { mounted, walk } from "../runtime/tree";
import { paint } from "./paint";
import { RetainedPaint } from "./retained";

function view(step: number) {
  return column(
    text(step % 2 ? "界́ xy" : "abcd").background(step % 3 ? "red" : "blue"),
    overlay(
      text("underneath").background("green"),
      step % 4
        ? text("front")
            .background("cyan")
            .position("absolute")
            .left(step % 5)
        : null,
    ).height(2),
    scroll(column(Array.from({ length: 15 }, (_, i) => text(`line ${i}`))), {
      defaultOffset: step % 8,
      scrollbar: step % 2 ? "auto" : "hidden",
    }).height(3),
    row(text("left").width(`${30 + (step % 40)}%`), text("right")),
  ).width("fill");
}
test("retained painting matches a full repaint through geometry, styling, removals, scrolling, and resize", () => {
  const renderer = new RetainedPaint();
  const invalidation = new LayoutInvalidation();
  const root = mounted(view(0), null);
  for (let step = 0; step < 50; step++) {
    // Reconcile immutable descriptions while preserving mounted identity.
    update(root, view(step));
    resolveStyles(root);
    invalidation.changed(root);
    const size = { width: 8 + (step % 23), height: 2 + (step % 15) };
    layout(root, size);
    repositionScroll(root);
    const retained = renderer.render(root, size);
    expect(retained.cells).toEqual(paint(root, size).cells);
    for (const node of walk(root)) invalidateLayout(node);
    layout(root, size);
    expect(retained.cells).toEqual(paint(root, size).cells);
  }
});
import type { Element } from "../element/node";
import type { Mounted } from "../runtime/tree";

import { flatten } from "../element/node";
function update(node: Mounted, element: Element): void {
  node.element = element;
  const children = flatten(element.data.children);
  node.children = children.map((child, index) => {
    const previous = node.children[index];
    const next =
      previous?.element.data.kind === child.data.kind
        ? previous
        : mounted(child, node);
    update(next, child);
    return next;
  });
}
test("small paint changes retain untouched cells and clear the full footprint of wide glyphs", () => {
  const root = mounted(text("界abc"), null);
  const renderer = new RetainedPaint();
  const invalidation = new LayoutInvalidation();
  const size = { width: 20, height: 10 };
  resolveStyles(root);
  invalidation.changed(root);
  layout(root, size);
  const before = renderer.render(root, size);
  root.element = text("abcde");
  resolveStyles(root);
  invalidation.changed(root);
  const after = renderer.render(root, size);
  expect(after.cells).toEqual(paint(root, size).cells);
  expect(renderer.paintedCells).toBe(200);
  expect(after.get(0, 1)).not.toBe(before.get(0, 1));
  // A text leaf filling the screen owns every row; content-sized children narrow damage.
  update(root, column(text("abcde"), text("footer")));
  resolveStyles(root);
  invalidation.changed(root);
  layout(root, size);
  const initial = renderer.render(root, size);
  update(root, column(text("12345"), text("footer")));
  resolveStyles(root);
  invalidation.changed(root);
  const next = renderer.render(root, size);
  expect(renderer.paintedCells).toBe(20);
  expect(next.get(0, 1)).toBe(initial.get(0, 1));
});
test("overflow and stacking changes clear escaped content outside the owner's box", () => {
  const renderer = new RetainedPaint();
  const root = mounted(
    overlay(text("abcdefgh").width(8)).width(3).overflow("visible"),
    null,
  );
  const invalidation = new LayoutInvalidation();
  for (const overflow of ["visible", "clip", "visible"] as const) {
    update(
      root,
      column(overlay(text("abcdefgh").width(8)).width(3).overflow(overflow)),
    );
    resolveStyles(root);
    invalidation.changed(root);
    layout(root, { width: 20, height: 5 });
    expect(renderer.render(root, { width: 20, height: 5 }).cells).toEqual(
      paint(root, { width: 20, height: 5 }).cells,
    );
  }
});
