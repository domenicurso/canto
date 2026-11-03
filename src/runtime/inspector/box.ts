import type { Rect } from "../../layout/geometry";
import type { Screen } from "../../render/screen";
import type { Mounted } from "../components/tree";
import type { DebugSelection } from "./selection";

import { contains, inset, intersect } from "../../layout/geometry";
import { composite } from "../../render/opacity";

export const boxColors = {
  content: "#38bdf8",
  padding: "#4ade80",
  border: "#facc15",
  gap: "#fb923c",
};

/** Viewport layers escape ancestor clips, exactly as they do in the renderer. */
export function inspectionClip(node: Mounted, viewport: Rect): Rect {
  let clip = viewport;
  for (let current: Mounted | null = node; current; current = current.parent) {
    if (current.element.data.props.overlay) break;
    const parent = current.parent;
    if (
      parent &&
      (parent.layout.style.overflow !== "visible" ||
        parent.element.data.kind === "scroll")
    )
      clip = intersect(clip, parent.layout.inner);
  }
  return clip;
}

export function paintBox(screen: Screen, node: Mounted): void {
  const viewport = { x: 0, y: 0, width: screen.width, height: screen.height };
  const clip = inspectionClip(node, viewport);
  const rect = intersect(node.layout.rect, clip);
  const { style } = node.layout;
  const borderBox = inset(node.layout.rect, {
    ...style,
    padding: 0,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
  });
  const layer = screen.clone();
  for (let y = rect.y; y < rect.y + rect.height; y++) {
    for (let x = rect.x; x < rect.x + rect.width; x++) {
      const color = !contains(borderBox, x, y)
        ? boxColors.border
        : contains(node.layout.inner, x, y)
          ? boxColors.content
          : boxColors.padding;
      tint(layer, x, y, color);
    }
  }
  paintGaps(layer, node, clip);
  composite(screen, layer, clip, 0.35);
}

function tint(screen: Screen, x: number, y: number, color: string): void {
  const index = y * screen.width + x;
  const cell = screen.cells[index];
  if (!cell) return;
  screen.touchRow(y);
  // Preserve glyphs, wide-cell pairs, and pixel ownership under the diagnostic tint.
  screen.cells[index] = {
    ...cell,
    pixels: undefined,
    style: { ...cell.style, background: color },
  };
}

function paintGaps(screen: Screen, node: Mounted, clip: Rect): void {
  const { kind } = node.element.data;
  if (!["row", "column", "box", "component"].includes(kind)) return;
  const children = node.children.filter(
    (child) =>
      child.layout.style.position !== "absolute" &&
      !child.element.data.props.overlay,
  );
  for (let index = 1; index < children.length; index++) {
    const a = children[index - 1]?.layout.rect;
    const b = children[index]?.layout.rect;
    if (!a || !b) continue;
    const gap =
      kind === "row"
        ? {
            x: a.x + a.width,
            y: node.layout.inner.y,
            width: Math.max(0, b.x - a.x - a.width),
            height: node.layout.inner.height,
          }
        : {
            x: node.layout.inner.x,
            y: a.y + a.height,
            width: node.layout.inner.width,
            height: Math.max(0, b.y - a.y - a.height),
          };
    const area = intersect(intersect(gap, node.layout.inner), clip);
    for (let y = area.y; y < area.y + area.height; y++)
      for (let x = area.x; x < area.x + area.width; x++)
        tint(screen, x, y, boxColors.gap);
  }
}

export function highlightSelection(
  screen: Screen,
  model: DebugSelection,
  enabled: boolean,
): Screen {
  const shown = screen.clone();
  const node = model.hovered ?? (model.picking ? undefined : model.selected);
  if (enabled && node?.active) paintBox(shown, node);
  return shown;
}
