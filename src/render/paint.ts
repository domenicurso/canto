import type { Mounted, Rect } from "../runtime/tree";

import { intersect } from "../layout/geometry";
import { overlays } from "../runtime/overlays";
import { border } from "./border";
import { drawContent, drawText } from "./content";
import { drawEditor } from "./editor";
import { joinedBorders } from "./joined-borders";
import { composite } from "./opacity";
import { Screen } from "./screen";
import { scrollbar } from "./scrollbar";

export function paint(
  root: Mounted,
  size: { width: number; height: number },
): Screen {
  const screen = new Screen(size.width, size.height);
  draw(root, screen, { x: 0, y: 0, ...size });
  return screen;
}
export function draw(node: Mounted, screen: Screen, clip: Rect): void {
  const opacity = node.style.opacity ?? 1;
  if (opacity === 0) return;
  if (opacity === 1) return drawLayer(node, screen, clip);
  const layer = screen.clone();
  drawLayer(node, layer, clip);
  composite(screen, layer, clip, opacity);
}
function drawLayer(node: Mounted, screen: Screen, clip: Rect): void {
  const ownClip = intersect(clip, node.rect);
  if ((!ownClip.width || !ownClip.height) && node.style.overflow !== "visible")
    return;
  background(node, screen, ownClip);
  border(node, screen, ownClip);
  const textClip = intersect(clip, node.inner);
  const kind = node.element.data.kind;
  if (kind === "text") drawText(node, screen, textClip);
  else if (kind === "input" || kind === "textarea")
    drawEditor(node, screen, textClip);
  drawContent(node, screen, textClip);
  const childClip =
    node.style.overflow === "visible" && kind !== "scroll" ? clip : textClip;
  const children = node.children
    .map((child, index) => ({ child, index }))
    .sort(
      (a, b) =>
        (a.child.style.zIndex ?? 0) - (b.child.style.zIndex ?? 0) ||
        a.index - b.index,
    );
  for (const { child } of children)
    if (!child.element.data.props.overlay) draw(child, screen, childClip);
  joinedBorders(node, screen, childClip);
  if (kind === "scroll") scrollbar(node, screen, ownClip);
  if (!node.parent)
    for (const layer of overlays(node)) draw(layer, screen, clip);
}
function background(node: Mounted, screen: Screen, clip: Rect): void {
  if (node.style.background == null) return;
  for (let y = clip.y; y < clip.y + clip.height; y++)
    screen.put({ ...clip, y }, " ".repeat(clip.width), node.style, clip);
}
