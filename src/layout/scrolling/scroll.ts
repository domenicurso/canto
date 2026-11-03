import type { Mounted } from "../../runtime/components/tree";
import type { Place } from "../flow/flow";
import type { Size } from "../geometry";

import { measure } from "../measurement/measure";
import { resolveScrollOffset } from "./scroll-state";

export function scrollBars(
  node: Mounted,
  size: Size,
): { vertical: boolean; horizontal: boolean } {
  const props = node.element.data.props.scroll;
  const enabled = props?.scrollbar !== "hidden";
  const stable = props?.gutter === "stable" || props?.scrollbar === "visible";
  return {
    vertical:
      enabled &&
      props?.axis !== "horizontal" &&
      (stable || size.height > node.layout.inner.height),
    horizontal:
      enabled &&
      props?.axis !== undefined &&
      props.axis !== "vertical" &&
      (stable || size.width > node.layout.inner.width),
  };
}
export function arrangeScroll(node: Mounted, place: Place): void {
  const child = node.children[0];
  if (!child) return;
  const props = node.element.data.props.scroll;
  const horizontal = props?.axis === "horizontal" || props?.axis === "both";
  const vertical = props?.axis !== "horizontal";
  const original = node.layout.inner;
  let area = original;
  let size = { width: 0, height: 0 };
  for (let pass = 0; pass < 3; pass++) {
    size = measure(child, {
      width: horizontal ? Infinity : area.width,
      height: vertical ? Infinity : area.height,
    });
    const bars = scrollBars(node, size);
    area = {
      ...original,
      width: Math.max(0, original.width - Number(bars.vertical)),
      height: Math.max(0, original.height - Number(bars.horizontal)),
    };
    node.layout.inner = area;
  }
  node.scrolling.maxOffsetX = horizontal
    ? Math.max(0, size.width - area.width)
    : 0;
  node.scrolling.maxOffset = vertical
    ? Math.max(0, size.height - area.height)
    : node.scrolling.maxOffsetX;
  resolveScrollOffset(node.scrolling, node.element.data.props.scroll);
  node.scrolling.scrollPlacement = {
    x: node.scrolling.offsetX,
    y: vertical ? node.scrolling.offset : 0,
  };
  place(child, {
    x: area.x - node.scrolling.offsetX,
    y: area.y - (vertical ? node.scrolling.offset : 0),
    ...size,
  });
}

export function repositionScroll(node: Mounted): void {
  if (node.element.data.kind === "scroll") {
    resolveScrollOffset(node.scrolling, node.element.data.props.scroll);
    const next = {
      x: node.scrolling.offsetX,
      y:
        node.element.data.props.scroll?.axis === "horizontal"
          ? 0
          : node.scrolling.offset,
    };
    const dx = node.scrolling.scrollPlacement.x - next.x;
    const dy = node.scrolling.scrollPlacement.y - next.y;
    if (dx || dy) for (const child of node.children) translate(child, dx, dy);
    node.scrolling.scrollPlacement = next;
  }
  for (const child of node.children) repositionScroll(child);
}
function translate(node: Mounted, dx: number, dy: number): void {
  node.layout.rect = {
    ...node.layout.rect,
    x: node.layout.rect.x + dx,
    y: node.layout.rect.y + dy,
  };
  node.layout.inner = {
    ...node.layout.inner,
    x: node.layout.inner.x + dx,
    y: node.layout.inner.y + dy,
  };
  for (const child of node.children) translate(child, dx, dy);
}
