import type { Color } from "./types";

const NAMED_COLORS: Record<string, number> = {
  black: 30,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  white: 37,
  brightBlack: 90,
  brightRed: 91,
  brightGreen: 92,
  brightYellow: 93,
  brightBlue: 94,
  brightMagenta: 95,
  brightCyan: 96,
  brightWhite: 97,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseHex(color: `#${string}`): [number, number, number] | null {
  const hex = color.slice(1);
  if (hex.length === 3) {
    if (hex[0] && hex[1] && hex[2]) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return [r, g, b];
    }
    return null;
  }
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return [r, g, b];
  }
  return null;
}

export function colorToAnsi(
  color: Color | null,
  type: "foreground" | "background",
): string | null {
  if (color === null || color === undefined) {
    return null;
  }
  const prefix = type === "foreground" ? "38" : "48";

  if (typeof color === "string") {
    if (NAMED_COLORS[color] !== undefined) {
      return `\u001B[${NAMED_COLORS[color] + (type === "foreground" ? 0 : 10)}m`;
    }
    if (color.startsWith("#")) {
      const parsed = parseHex(color as `#${string}`);
      if (parsed) {
        const [r, g, b] = parsed;
        return `\u001B[${prefix};2;${r};${g};${b}m`;
      }
    }
  } else if (Array.isArray(color) && color.length === 3) {
    const [r, g, b] = color.map((v) => clamp(Math.round(v), 0, 255));
    return `\u001B[${prefix};2;${r};${g};${b}m`;
  }

  return null;
}
