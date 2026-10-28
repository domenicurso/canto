import { setScroll } from "./focus";

import type { KeyEvent, PointerEvent } from "../element/events";
import type { Mounted } from "./tree";

export function scrollKey(node: Mounted, event: KeyEvent): boolean {
  const axis = node.element.data.props.scroll?.axis ?? "vertical";
  const horizontal = axis === "horizontal";
  const page = horizontal ? node.inner.width : node.inner.height;
  const amount = event.key === "pageup" ? -page : event.key === "pagedown" ? page : 0;
  const dx = event.key === "left" ? -1 : event.key === "right" ? 1 : horizontal ? amount : 0;
  const dy = event.key === "up" ? -1 : event.key === "down" ? 1 : horizontal ? 0 : amount;
  if ((dx && axis !== "vertical") || (dy && !horizontal)) {
    move(node, { x: axis === "vertical" ? 0 : dx, y: horizontal ? 0 : dy });
    return true;
  }
  return false;
}
export function scrollWheel(node: Mounted, event: PointerEvent): void {
  const axis = node.element.data.props.scroll?.axis ?? "vertical";
  move(node, {
    x:
      axis === "horizontal"
        ? event.deltaX || event.deltaY
        : axis === "both"
          ? (event.deltaX ?? 0)
          : 0,
    y: axis === "horizontal" ? 0 : event.deltaY,
  });
}
function move(node: Mounted, delta: { x: number; y: number }): void {
  const props = node.element.data.props.scroll;
  const position = { x: node.offsetX + delta.x, y: node.offset + delta.y };
  setScroll(
    node,
    props?.axis === "both" ? position : props?.axis === "horizontal" ? position.x : position.y,
  );
}
