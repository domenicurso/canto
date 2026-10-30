import type { Mounted } from "../runtime/tree";
import type { Rect, Size } from "./geometry";

import { wrap } from "../text/wrap";
import { flow } from "./flow";
import { bounded, dimension, inset } from "./geometry";
import { invalidateMeasurement, content, measure } from "./measure";
import { placeOverlays } from "./overlay";
import { arrangeScroll } from "./scroll";

const placements = new WeakMap<Mounted, Rect>();
let placed = 0;
export function invalidateLayout(node: Mounted): void {
  invalidateMeasurement(node);
  placements.delete(node);
}
export function layout(
  root: Mounted,
  viewport: Size,
  fullscreen = true,
): number {
  placed = 0;
  const natural = measure(root, viewport);
  place(root, {
    x: 0,
    y: 0,
    width: fullscreen
      ? viewport.width
      : Math.min(viewport.width, natural.width),
    height: fullscreen
      ? viewport.height
      : Math.min(viewport.height, natural.height),
  });
  placeOverlays(root, place);
  return placed;
}
export function positionOverlays(root: Mounted): void {
  placeOverlays(root, place);
}
function place(node: Mounted, allocation: Rect): void {
  const rect = {
    ...allocation,
    x: allocation.x + (node.layout.style.translateX ?? 0),
    y: allocation.y + (node.layout.style.translateY ?? 0),
  };
  const previous = placements.get(node);
  if (
    previous &&
    node.layout.rect.x === rect.x &&
    node.layout.rect.y === rect.y &&
    node.layout.rect.width === rect.width &&
    node.layout.rect.height === rect.height
  )
    return;
  placed++;
  placements.set(node, rect);
  node.layout.rect = rect;
  node.layout.inner = inset(rect, node.layout.style);
  const kind = node.element.data.kind;
  if (kind === "text" || kind === "input" || kind === "textarea") {
    node.layout.lines = wrap(
      content(node) || node.element.data.props.input?.placeholder || "",
      node.layout.inner.width,
      kind === "input"
        ? { ...node.layout.style, wrap: "none" }
        : node.layout.style,
    );
    return;
  }
  if (kind === "scroll") arrangeScroll(node, place);
  else if (kind === "overlay") arrangeOverlay(node);
  else flow(node, place);
  for (const child of node.children.filter(
    (child) => child.layout.style.position === "absolute",
  ))
    absolute(child, node.layout.inner);
}
function arrangeOverlay(node: Mounted): void {
  for (const child of node.children.filter(
    (child) => child.layout.style.position !== "absolute",
  )) {
    const size = measure(child, node.layout.inner);
    place(child, { ...node.layout.inner, ...size });
  }
}
function absolute(node: Mounted, area: Rect): void {
  const s = node.layout.style;
  const size = measure(node, area);
  const w =
    dimension(s.width, area.width) ??
    (s.left !== undefined && s.right !== undefined
      ? area.width - s.left - s.right
      : size.width);
  const h =
    dimension(s.height, area.height) ??
    (s.top !== undefined && s.bottom !== undefined
      ? area.height - s.top - s.bottom
      : size.height);
  const width = bounded(w, s.minWidth, s.maxWidth),
    height = bounded(h, s.minHeight, s.maxHeight);
  place(node, {
    x:
      area.x +
      (s.left ?? (s.right === undefined ? 0 : area.width - s.right - width)),
    y:
      area.y +
      (s.top ?? (s.bottom === undefined ? 0 : area.height - s.bottom - height)),
    width,
    height,
  });
}
