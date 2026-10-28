import type { Color, Style } from "../style/types";

const named: Record<string, number> = {
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
function color(value: Color, background: boolean): string {
  const prefix = background ? 48 : 38;
  if (typeof value !== "string")
    return `${prefix};2;${value.map((channel) => Math.max(0, Math.min(255, Math.round(channel)))).join(";")}`;
  if (value in named) {
    const n = named[value] ?? 0;
    return String((background ? 40 : 30) + (n < 8 ? n : n - 8 + 60));
  }
  const hex = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(value)?.[1];
  if (!hex) throw new Error(`Unsupported color: ${value}`);
  const full = hex.length === 3 ? Array.from(hex, (c) => c + c).join("") : hex;
  return `${prefix};2;${[0, 2, 4].map((index) => Number.parseInt(full.slice(index, index + 2), 16)).join(";")}`;
}
const sequences = new WeakMap<Style, string>();
export function ansi(style: Style): string {
  const existing = sequences.get(style);
  if (existing) return existing;
  const sequence = encode(style);
  sequences.set(style, sequence);
  return sequence;
}
function encode(style: Style): string {
  const codes = ["0"];
  if (style.foreground != null) codes.push(color(style.foreground, false));
  if (style.background != null) codes.push(color(style.background, true));
  if (style.bold) codes.push("1");
  if (style.faint) codes.push("2");
  if (style.italic) codes.push("3");
  if (style.underline) codes.push("4");
  return `\x1b[${codes.join(";")}m`;
}
