import type { Rect } from "../runtime/tree";
import type { ColorTheme, RGB } from "../style/colors";
import type { Style } from "../style/types";
import type { PixelSurface } from "./pixel-surface";
import type { Cell, Screen } from "./screen";

import { intersect } from "../layout/geometry";
import { rgb } from "../style/colors";

type SurfaceCache = Map<
  string | PixelSurface,
  Map<string | PixelSurface, PixelSurface>
>;

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
  const { width, height } = screen;
  const area = intersect(clip, { x: 0, y: 0, width, height });
  const surfaces: SurfaceCache = new Map();
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
        pixels: compositePixels(top, bottom, {
          a: a.background,
          b: b.background,
          opacity,
          surfaces,
        }),
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

function compositePixels(
  top: Cell,
  bottom: Cell,
  blend: {
    a: RGB;
    b: RGB;
    opacity: number;
    surfaces: Map<
      string | PixelSurface,
      Map<string | PixelSurface, PixelSurface>
    >;
  },
): Cell["pixels"] {
  const owner = top.pixels?.owner ?? bottom.pixels?.owner;
  if (!owner) return undefined;
  if (top.pixels?.surface === bottom.pixels?.surface) return top.pixels;
  const base = bottom.pixels?.surface ?? blend.b;
  const key = top.pixels?.surface ?? String(blend.a);
  const baseKey = bottom.pixels?.surface ?? String(blend.b);
  const variants =
    blend.surfaces.get(baseKey) ??
    new Map<string | PixelSurface, PixelSurface>();
  blend.surfaces.set(baseKey, variants);
  const surface = variants.get(key) ?? {
    top: top.pixels?.surface ?? blend.a,
    bottom: base,
    opacity: blend.opacity,
  };
  variants.set(key, surface);
  return { owner, text: top.pixels?.text ?? top.text !== " ", surface };
}
