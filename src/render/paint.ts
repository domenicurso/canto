import type { Mounted, Rect } from "../runtime/tree";
import type { Style } from "../style/types";

import { intersect } from "../layout/geometry";
import { drawContent, drawText } from "./content";
import { drawEditor } from "./editor";
import { joinedBorders } from "./joined-borders";
import { Screen } from "./screen";
import { scrollbar } from "./scrollbar";

const borders = {
  single: "┌┐└┘─│",
  rounded: "╭╮╰╯─│",
  double: "╔╗╚╝═║",
  heavy: "┏┓┗┛━┃",
};
export function paint(
  root: Mounted,
  size: { width: number; height: number },
): Screen {
  const screen = new Screen(size.width, size.height);
  draw(root, screen, { x: 0, y: 0, ...size });
  return screen;
}
export function draw(node: Mounted, screen: Screen, clip: Rect): void {
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
  for (const { child } of children) draw(child, screen, childClip);
  joinedBorders(node, screen, childClip);
  if (kind === "scroll") scrollbar(node, screen, ownClip);
}
function background(node: Mounted, screen: Screen, clip: Rect): void {
  if (node.style.background == null) return;
  for (let y = clip.y; y < clip.y + clip.height; y++)
    screen.put({ ...clip, y }, " ".repeat(clip.width), node.style, clip);
}
function border(node: Mounted, screen: Screen, clip: Rect): void {
  const type = node.style.border;
  if (!type || type === "none") return;
  const [tl, tr, bl, br, h, v] = Array.from(borders[type]);
  const r = node.rect;
  if (!r.width || !r.height) return;
  const s: Style = {
    ...node.style,
    foreground: node.style.borderColor ?? node.style.foreground,
    background: node.style.borderBackground ?? node.style.background,
  };
  const put = (x: number, y: number, text: string): void =>
    screen.put({ x, y, width: r.width, height: 1 }, text, s, clip);
  if (node.style.borderTop !== false)
    put(
      r.x,
      r.y,
      (tl ?? "") +
        (h ?? "").repeat(Math.max(0, r.width - 2)) +
        (r.width > 1 ? (tr ?? "") : ""),
    );
  if (node.style.borderBottom !== false && r.height > 1)
    put(
      r.x,
      r.y + r.height - 1,
      (bl ?? "") +
        (h ?? "").repeat(Math.max(0, r.width - 2)) +
        (r.width > 1 ? (br ?? "") : ""),
    );
  for (let y = r.y + 1; y < r.y + r.height - 1; y++) {
    if (node.style.borderLeft !== false) put(r.x, y, v ?? "");
    if (node.style.borderRight !== false) put(r.x + r.width - 1, y, v ?? "");
  }
}
