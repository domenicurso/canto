import type { Mounted, Rect } from "../runtime/tree";
import type { Allocation } from "./allocation";

import { allocate } from "./allocation";
import { borderOverlap, flowGaps } from "./border-joining";
import { bounded, dimension } from "./geometry";
import { measure } from "./measure";

export type Place = (node: Mounted, rect: Rect) => void;
export function flow(node: Mounted, place: Place): void {
  const horizontal = node.element.data.kind === "row";
  const area = node.inner;
  const children = node.children.filter(
    (child) => child.style.position !== "absolute",
  );
  const items = allocate(children, area, horizontal);
  const used =
    items.reduce((sum, item) => sum + item.flow, 0) +
    flowGaps(children, horizontal);
  const free = Math.max(0, (horizontal ? area.width : area.height) - used);
  const { start, extra } = distribution(node, free, items.length);
  let cursor = start;
  for (const [index, item] of items.entries()) {
    cursor -= borderOverlap(children[index - 1], item.node, horizontal);
    const cross = crossPlacement(item, node, horizontal);
    const rect = horizontal
      ? {
          x: area.x + Math.floor(cursor),
          y: area.y + cross.offset,
          width: item.flow,
          height: cross.size,
        }
      : {
          x: area.x + cross.offset,
          y: area.y + Math.floor(cursor),
          width: cross.size,
          height: item.flow,
        };
    place(item.node, rect);
    cursor += item.flow + (node.style.gap ?? 0) + extra;
  }
}
function crossPlacement(
  item: Allocation,
  parent: Mounted,
  horizontal: boolean,
): { size: number; offset: number } {
  const s = item.node.style;
  const available = horizontal ? parent.inner.height : parent.inner.width;
  const token = horizontal ? s.height : s.width;
  const align = s.alignSelf ?? parent.style.align ?? "start";
  const measured = horizontal
    ? measure(item.node, { width: item.flow, height: available }).height
    : item.size.width;
  const natural =
    dimension(token, available) ?? (align === "stretch" ? available : measured);
  const size = bounded(
    natural,
    horizontal ? s.minHeight : s.minWidth,
    horizontal ? s.maxHeight : s.maxWidth,
  );
  return {
    size,
    offset: Math.max(
      0,
      Math.floor(
        (available - size) *
          (align === "center" ? 0.5 : align === "end" ? 1 : 0),
      ),
    ),
  };
}
function distribution(
  node: Mounted,
  free: number,
  count: number,
): { start: number; extra: number } {
  switch (node.style.justify) {
    case "center":
      return { start: Math.floor(free / 2), extra: 0 };
    case "end":
      return { start: free, extra: 0 };
    case "between":
      return { start: 0, extra: count > 1 ? free / (count - 1) : 0 };
    case "around":
      return {
        start: count ? free / count / 2 : 0,
        extra: count ? free / count : 0,
      };
    case "evenly":
      return { start: free / (count + 1), extra: free / (count + 1) };
    default:
      return { start: 0, extra: 0 };
  }
}
