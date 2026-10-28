import type { Mounted, Rect } from "../runtime/tree";
import type { BorderGlyphs, Style } from "../style/types";
import type { Screen } from "./screen";

const borders = {
  single: "┌┐└┘─│",
  rounded: "╭╮╰╯─│",
  double: "╔╗╚╝═║",
  heavy: "┏┓┗┛━┃",
};
type Side = "Top" | "Right" | "Bottom" | "Left";
function borderStyle(style: Style, side: Side): Style {
  const color = style[`border${side}Color`];
  return {
    ...style,
    foreground:
      color !== undefined
        ? color
        : style.borderColor !== undefined
          ? style.borderColor
          : style.foreground,
    background:
      style.borderBackground !== undefined
        ? style.borderBackground
        : style.background,
  };
}
function glyphs(node: Mounted): Readonly<BorderGlyphs> | undefined {
  const type = node.style.border;
  if (!type || type === "none") return undefined;
  if (typeof type === "object") return type;
  const [
    topLeft = "",
    topRight = "",
    bottomLeft = "",
    bottomRight = "",
    h = "",
    v = "",
  ] = Array.from(borders[type]);
  return {
    topLeft,
    topRight,
    bottomLeft,
    bottomRight,
    top: h,
    bottom: h,
    left: v,
    right: v,
  };
}
export function border(node: Mounted, screen: Screen, clip: Rect): void {
  const g = glyphs(node);
  const r = node.rect;
  if (!g || !r.width || !r.height) return;
  const put = (x: number, y: number, text: string, side: Side): void => {
    screen.put(
      { x, y, width: r.width, height: 1 },
      text,
      borderStyle(node.style, side),
      clip,
    );
  };
  if (node.style.borderTop !== false)
    put(
      r.x,
      r.y,
      g.topLeft +
        g.top.repeat(Math.max(0, r.width - 2)) +
        (r.width > 1 ? g.topRight : ""),
      "Top",
    );
  if (node.style.borderBottom !== false && r.height > 1)
    put(
      r.x,
      r.y + r.height - 1,
      g.bottomLeft +
        g.bottom.repeat(Math.max(0, r.width - 2)) +
        (r.width > 1 ? g.bottomRight : ""),
      "Bottom",
    );
  for (let y = r.y + 1; y < r.y + r.height - 1; y++) {
    if (node.style.borderLeft !== false) put(r.x, y, g.left, "Left");
    if (node.style.borderRight !== false)
      put(r.x + r.width - 1, y, g.right, "Right");
  }
}
