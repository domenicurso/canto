const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
export function graphemes(text: string): string[] {
  return Array.from(segmenter.segment(text), (part) => part.segment);
}
export function columns(grapheme: string): number {
  return Bun.stringWidth(grapheme);
}
export function width(text: string): number {
  return graphemes(text).reduce((sum, part) => sum + columns(part), 0);
}
export function take(text: string, limit: number): string {
  let result = "";
  let used = 0;
  for (const part of graphemes(text)) {
    const size = columns(part);
    if (used + size > limit) break;
    result += part;
    used += size;
  }
  return result;
}
export function sanitize(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n ]/g, " ")
    .replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, "");
}
