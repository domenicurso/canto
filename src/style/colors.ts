import type { Color } from "./types";
export const namedColors: Readonly<Record<string, number>> = {
  black: 0,
  red: 1,
  green: 2,
  yellow: 3,
  blue: 4,
  magenta: 5,
  cyan: 6,
  white: 7,
  gray: 8,
  grey: 8,
  brightBlack: 8,
  brightRed: 9,
  brightGreen: 10,
  brightYellow: 11,
  brightBlue: 12,
  brightMagenta: 13,
  brightCyan: 14,
  brightWhite: 15,
};
const palette = [
  0x000000, 0x800000, 0x008000, 0x808000, 0x000080, 0x800080, 0x008080,
  0xc0c0c0, 0x808080, 0xff0000, 0x00ff00, 0xffff00, 0x0000ff, 0xff00ff,
  0x00ffff, 0xffffff,
];
export type RGB = readonly [number, number, number];
export function rgb(value: Color | null | undefined): RGB {
  if (value == null) return [0, 0, 0];
  if (typeof value !== "string") return value;
  const named = namedColors[value];
  let color = named === undefined ? undefined : palette[named];
  if (color === undefined) {
    const hex = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(value)?.[1];
    if (!hex) throw new Error(`Unsupported color: ${value}`);
    color = parseInt(
      hex.length === 3 ? Array.from(hex, (char) => char + char).join("") : hex,
      16,
    );
  }
  return [(color >> 16) & 255, (color >> 8) & 255, color & 255];
}
