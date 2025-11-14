import { colorToAnsi } from "../style";

import type { StyleSnapshot } from "../style";

const RESET = "\u001B[0m";

export function styleToAnsi(style: StyleSnapshot): string {
  const parts: string[] = [];
  const fg = colorToAnsi(style.foreground ?? null, "foreground");
  const bg = colorToAnsi(style.background ?? null, "background");
  if (fg) parts.push(fg);
  if (bg) parts.push(bg);
  if (style.bold) parts.push("\u001B[1m");
  if (style.faint) parts.push("\u001B[2m");
  if (style.italic) parts.push("\u001B[3m");
  if (style.underline) parts.push("\u001B[4m");
  return parts.join("");
}

export function resetAnsi(): string {
  return RESET;
}
