import type { Rect } from "../runtime/tree";
import type { ColorTheme, RGB } from "../style/colors";
import type { Style } from "../style/types";
import type { Screen } from "./screen";

import { intersect } from "../layout/geometry";
import { rgb } from "../style/colors";

function colors(
  style: Style,
  theme?: ColorTheme,
): { foreground: RGB; background: RGB } {
  const foreground =
    style.foreground == null
      ? (theme?.foreground ?? rgb("white", theme))
      : rgb(style.foreground, theme);
  const background =
    style.background == null
      ? (theme?.background ?? rgb(null))
      : rgb(style.background, theme);
  return style.inverse
    ? { foreground: background, background: foreground }
    : { foreground, background };
}
function blend(top: RGB, bottom: RGB, opacity: number): RGB {
  const channel = (index: number): number =>
    Math.round(
      (top[index] ?? 0) * opacity + (bottom[index] ?? 0) * (1 - opacity),
    );
  return [channel(0), channel(1), channel(2)];
}
export function composite(
  screen: Screen,
  layer: Screen,
  clip: Rect,
  opacity: number,
): void {
  const area = intersect(clip, {
    x: 0,
    y: 0,
    width: screen.width,
    height: screen.height,
  });
  for (let y = area.y; y < area.y + area.height; y++) {
    for (let x = area.x; x < area.x + area.width; x++) {
      const index = y * screen.width + x;
      const top = layer.cells[index],
        bottom = screen.cells[index];
      if (!top || !bottom || top === bottom) continue;
      const a = colors(top.style, screen.theme),
        b = colors(bottom.style, screen.theme);
      screen.cells[index] = {
        ...top,
        style: {
          ...top.style,
          inverse: false,
          foreground: blend(
            a.foreground,
            top.text === bottom.text ? b.foreground : b.background,
            opacity,
          ),
          background: blend(a.background, b.background, opacity),
          underlineColor:
            top.style.underlineColor == null
              ? undefined
              : blend(
                  rgb(top.style.underlineColor, screen.theme),
                  b.background,
                  opacity,
                ),
        },
      };
    }
  }
}
