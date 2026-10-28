import { columns, graphemes, sanitize, take, width } from "./columns";

import type { Style } from "../style/types";

export function wrap(text: string, available: number, style: Style = {}): string[] {
  if (available <= 0) return [];
  const lines = sanitize(text)
    .split(/\r?\n/)
    .flatMap((line) => split(line, available, style.wrap ?? "word"));
  const limit =
    style.maxLines === undefined ? lines.length : Math.max(0, Math.floor(style.maxLines));
  const result = lines.slice(0, limit);
  if (style.overflow === "ellipsis" && result.length) {
    for (let index = 0; index < result.length; index++) {
      const line = result[index] ?? "";
      if (width(line) > available || (index === result.length - 1 && lines.length > limit)) {
        result[index] = take(line, available - 1) + "…";
      }
    }
  }
  return result.map((line) => take(line, available));
}
function split(line: string, available: number, mode: NonNullable<Style["wrap"]>): string[] {
  if (mode === "none" || !Number.isFinite(available)) return [line];
  const result: string[] = [];
  let current = "";
  let used = 0;
  let lastSpace = -1;
  for (const part of graphemes(line)) {
    const size = columns(part);
    if (used + size > available && current) {
      if (mode === "word" && part === " ") {
        result.push(current.trimEnd());
        current = "";
        used = 0;
        lastSpace = -1;
        continue;
      }
      const boundary = mode === "word" ? lastSpace : -1;
      result.push(boundary > 0 ? current.slice(0, boundary).trimEnd() : current);
      current = boundary > 0 ? current.slice(boundary).trimStart() : "";
      used = width(current);
      lastSpace = current.lastIndexOf(" ");
    }
    if (size > available) continue;
    current += part;
    used += size;
    if (part === " ") lastSpace = current.length - 1;
  }
  result.push(current);
  return result;
}
