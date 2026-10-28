import { measure } from "./measure";

import type { Mounted } from "../runtime/tree";
import type { Place } from "./flow";
import type { Size } from "./geometry";

export function scrollBars(node: Mounted, size: Size): { vertical: boolean; horizontal: boolean } {
  const props = node.element.data.props.scroll;
  const enabled = props?.scrollbar !== "hidden";
  const stable = props?.gutter === "stable" || props?.scrollbar === "visible";
  return {
    vertical:
      enabled && props?.axis !== "horizontal" && (stable || size.height > node.inner.height),
    horizontal:
      enabled &&
      props?.axis !== undefined &&
      props.axis !== "vertical" &&
      (stable || size.width > node.inner.width),
  };
}
export function arrangeScroll(node: Mounted, place: Place): void {
  const child = node.children[0];
  if (!child) return;
  const props = node.element.data.props.scroll;
  const horizontal = props?.axis === "horizontal" || props?.axis === "both";
  const vertical = props?.axis !== "horizontal";
  const original = node.inner;
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
    node.inner = area;
  }
  node.maxOffsetX = horizontal ? Math.max(0, size.width - area.width) : 0;
  node.maxOffset = vertical ? Math.max(0, size.height - area.height) : node.maxOffsetX;
  const raw = props?.offset ?? (node.dirty ? props?.defaultOffset : undefined);
  const desiredY = typeof raw === "number" ? raw : raw?.y;
  const desiredX =
    typeof raw === "number" && !vertical ? raw : typeof raw === "object" ? raw.x : undefined;
  node.offset = Math.max(0, Math.min(node.maxOffset, desiredY ?? node.offset));
  node.offsetX = Math.max(0, Math.min(node.maxOffsetX, desiredX ?? node.offsetX));
  node.dirty = false;
  place(child, { x: area.x - node.offsetX, y: area.y - (vertical ? node.offset : 0), ...size });
}
