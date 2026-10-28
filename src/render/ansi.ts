import type { Color, Style } from "../style/types";

import { namedColors as named } from "../style/colors";

function color(value: Color, prefix: 38 | 48 | 58): string {
  if (typeof value !== "string")
    return `${prefix};2;${value.map((channel) => Math.max(0, Math.min(255, Math.round(channel)))).join(";")}`;
  if (value in named) {
    const n = named[value] ?? 0;
    return prefix === 58
      ? `58;5;${n}`
      : String((prefix === 48 ? 40 : 30) + (n < 8 ? n : n - 8 + 60));
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
  if (style.foreground != null) codes.push(color(style.foreground, 38));
  if (style.background != null) codes.push(color(style.background, 48));
  if (style.bold) codes.push("1");
  if (style.faint) codes.push("2");
  if (style.italic) codes.push("3");
  if (style.underline) {
    const forms = { single: 1, double: 2, curly: 3, dotted: 4, dashed: 5 };
    codes.push(style.underline === true ? "4" : `4:${forms[style.underline]}`);
  }
  if (style.underlineColor != null) codes.push(color(style.underlineColor, 58));
  if (style.strikethrough) codes.push("9");
  if (style.inverse) codes.push("7");
  return `\x1b[${codes.join(";")}m`;
}
