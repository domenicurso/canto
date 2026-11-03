import { expect, test } from "bun:test";

import type { Child } from "../../../index";
import type { Mounted } from "../../runtime/components/tree";

import { column, overlay, row, scroll, text } from "../../../index";
import { Element } from "../../element/node";
import { paint } from "../../render/painting/paint";
import { reconcile } from "../../runtime/components/reconcile";
import { mounted, walk } from "../../runtime/components/tree";
import { DebugPanel } from "../../runtime/inspector/panel";
import { unavailableClipboard } from "../../terminal/clipboard";
import { invalidateLayout, layout } from "../arrange";
import { LayoutInvalidation } from "../invalidation";
import { repositionScroll } from "../scrolling/scroll";
import { resolveStyles } from "../styling/resolve";

function tree(view: () => Child): Mounted {
  return mounted(
    new Element({
      kind: "component",
      children: [],
      props: {},
      call: { identity: view, render: view },
    }),
    null,
  );
}
function scene(step: number) {
  const entries = Array.from({ length: 10 + (step % 5) }, (_, i) =>
    text(`${i} ${"界 ab ".repeat(((i + step) % 6) + 1)}`).key(i),
  );
  return column(
    text("Header").height(1),
    row(
      scroll(column(entries), { defaultOffset: step % 7 })
        .width("60%")
        .height("fill"),
      column(
        text(step % 2 ? "short" : "long inspector description").wrap("word"),
        scroll(text("0123456789".repeat(10)), {
          axis: "horizontal",
          defaultOffset: step % 12,
        })
          .height(2)
          .width("fill"),
      )
        .width("fill")
        .height("fill"),
    )
      .height("fill")
      .gap(step % 2),
    overlay(
      text("Footer"),
      step % 3 ? text("badge").position("absolute").right(0) : null,
    ).height(1),
  )
    .padding(step % 3 === 0 ? 1 : 0)
    .fill();
}
test("nested scrolling and flexible constraints match fresh layout through repeated mutations and resize", () => {
  let step = 0;
  const render = () => scene(step);
  const root = tree(render);
  const invalidation = new LayoutInvalidation();
  const context = {
    app: {
      stop() {},
      viewport: { width: 80, height: 24 },
      clipboard: unavailableClipboard,
      debug: new DebugPanel(false, () => {}),
      selection: { mode: "text" as const, setMode: async () => {} },
    },
    schedule() {},
  };
  for (step = 0; step < 80; step++) {
    const size = {
      width: 1 + ((step * 17) % 90),
      height: 1 + ((step * 7) % 30),
    };
    reconcile(root, root.element, context);
    root.component.dirty = true;
    resolveStyles(root);
    invalidation.changed(root);
    layout(root, size);
    repositionScroll(root);
    const incremental = paint(root, size);
    const before = walk(root).map((node) => ({
      rect: node.layout.rect,
      inner: node.layout.inner,
    }));
    for (const node of walk(root)) invalidateLayout(node);
    layout(root, size);
    expect(
      walk(root).map((node) => ({
        rect: node.layout.rect,
        inner: node.layout.inner,
      })),
    ).toEqual(before);
    expect(paint(root, size).cells).toEqual(incremental.cells);
    verifyGeometry(root);
  }
});
function verifyGeometry(root: Mounted): void {
  for (const node of walk(root)) {
    for (const rect of [node.layout.rect, node.layout.inner]) {
      expect(Number.isFinite(rect.x) && Number.isFinite(rect.y)).toBe(true);
      expect(Number.isInteger(rect.width) && rect.width >= 0).toBe(true);
      expect(Number.isInteger(rect.height) && rect.height >= 0).toBe(true);
    }
    if (node.element.data.kind === "scroll") {
      expect(node.scrolling.offset).toBeGreaterThanOrEqual(0);
      expect(node.scrolling.offset).toBeLessThanOrEqual(
        node.scrolling.maxOffset,
      );
      expect(node.scrolling.offsetX).toBeLessThanOrEqual(
        node.scrolling.maxOffsetX,
      );
    }
  }
}
