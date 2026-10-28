import type { Mounted, Rect } from "../runtime/tree";
import type { Screen } from "./screen";

import { borderOwner, borderOverlap } from "../layout/border-joining";
import { contains } from "../layout/geometry";
import { hit } from "../runtime/focus";

// Direction bits are up, right, down, left. Corners at a shared edge become junctions.
const glyphs = {
  single: " ╵╶└╷│┌├╴┘─┴┐┤┬┼",
  heavy: " ╹╺┗╻┃┏┣╸┛━┻┓┫┳╋",
  double: " ╵╶╚╷║╔╠╴╝═╩╗╣╦╬",
};
export function joinedBorders(node: Mounted, screen: Screen, clip: Rect): void {
  if (!node.style.joinBorders) return;
  const horizontal = node.element.data.kind === "row";
  const children = node.children.filter(
    (child) => child.style.position !== "absolute",
  );
  for (const [index, child] of children.entries()) {
    const previous = children[index - 1];
    if (!borderOverlap(previous, child, horizontal) || !previous) continue;
    const a = borderOwner(previous),
      b = borderOwner(child);
    if (a && b) seam({ a, b, horizontal, parent: node }, screen, clip);
  }
}
function seam(
  pair: { a: Mounted; b: Mounted; horizontal: boolean; parent: Mounted },
  screen: Screen,
  clip: Rect,
): void {
  const { a, b, horizontal } = pair;
  const ar = a.rect,
    br = b.rect;
  if (horizontal ? ar.x + ar.width - 1 !== br.x : ar.y + ar.height - 1 !== br.y)
    return;
  const start = Math.max(horizontal ? ar.y : ar.x, horizontal ? br.y : br.x);
  const end = Math.min(
    horizontal ? ar.y + ar.height : ar.x + ar.width,
    horizontal ? br.y + br.height : br.x + br.width,
  );
  for (let position = start; position < end; position++) {
    const x = horizontal ? br.x : position,
      y = horizontal ? position : br.y;
    if (!contains(clip, x, y)) continue;
    const visible = hit(pair.parent, { x, y }, clip);
    if (visible !== a && visible !== b) continue;
    const owner = visible;
    const mask = directions(a, x, y) | directions(b, x, y);
    const type =
      owner.style.border === "rounded" ? "single" : owner.style.border;
    const text = type && type !== "none" ? glyphs[type][mask] : undefined;
    if (text)
      screen.put(
        { x, y, width: 1, height: 1 },
        text,
        {
          ...owner.style,
          foreground: owner.style.borderColor ?? owner.style.foreground,
          background: owner.style.borderBackground ?? owner.style.background,
        },
        clip,
      );
  }
}
function directions(node: Mounted, x: number, y: number): number {
  const r = node.rect,
    s = node.style;
  const right = r.x + r.width - 1,
    bottom = r.y + r.height - 1;
  let mask = 0;
  const horizontal =
    (y === r.y && s.borderTop !== false) ||
    (y === bottom && s.borderBottom !== false);
  const vertical =
    (x === r.x && s.borderLeft !== false) ||
    (x === right && s.borderRight !== false);
  if (horizontal) mask |= (x > r.x ? 8 : 0) | (x < right ? 2 : 0);
  if (vertical) mask |= (y > r.y ? 1 : 0) | (y < bottom ? 4 : 0);
  return mask;
}
