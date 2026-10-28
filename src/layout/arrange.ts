import { wrap } from "../text/wrap";
import { flow } from "./flow";
import { bounded, dimension, inset } from "./geometry";
import { beginMeasurement, content, measure } from "./measure";
import { arrangeScroll } from "./scroll";

import type { Mounted, Rect } from "../runtime/tree";
import type { Size } from "./geometry";

export function layout(root: Mounted, viewport: Size, fullscreen = true): void {
  beginMeasurement();
  const natural = measure(root, viewport);
  place(root, {
    x: 0,
    y: 0,
    width: fullscreen ? viewport.width : natural.width,
    height: fullscreen ? viewport.height : natural.height,
  });
}
function place(node: Mounted, rect: Rect): void {
  node.rect = rect;
  node.inner = inset(rect, node.style);
  const kind = node.element.data.kind;
  if (kind === "text" || kind === "input" || kind === "textarea") {
    node.lines = wrap(
      content(node) || node.element.data.props.input?.placeholder || "",
      node.inner.width,
      kind === "input" ? { ...node.style, wrap: "none" } : node.style,
    );
    return;
  }
  if (kind === "scroll") arrangeScroll(node, place);
  else if (kind === "overlay") arrangeOverlay(node);
  else flow(node, place);
  for (const child of node.children.filter((child) => child.style.position === "absolute"))
    absolute(child, node.inner);
}
function arrangeOverlay(node: Mounted): void {
  for (const child of node.children.filter((child) => child.style.position !== "absolute")) {
    const size = measure(child, node.inner);
    place(child, { ...node.inner, ...size });
  }
}
function absolute(node: Mounted, area: Rect): void {
  const s = node.style;
  const size = measure(node, area);
  const w =
    dimension(s.width, area.width) ??
    (s.left !== undefined && s.right !== undefined ? area.width - s.left - s.right : size.width);
  const h =
    dimension(s.height, area.height) ??
    (s.top !== undefined && s.bottom !== undefined ? area.height - s.top - s.bottom : size.height);
  const width = bounded(w, s.minWidth, s.maxWidth),
    height = bounded(h, s.minHeight, s.maxHeight);
  place(node, {
    x: area.x + (s.left ?? (s.right === undefined ? 0 : area.width - s.right - width)),
    y: area.y + (s.top ?? (s.bottom === undefined ? 0 : area.height - s.bottom - height)),
    width,
    height,
  });
}
