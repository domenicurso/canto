const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
export function graphemes(text: string): string[] {
  return Array.from(segmenter.segment(text), (part) => part.segment);
}
export function columns(grapheme: string): number {
  if (!grapheme || /^[\p{Mark}\p{Cf}\x00-\x1f\x7f-\x9f]+$/u.test(grapheme)) return 0;
  if (/\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20e3/u.test(grapheme)) return 2;
  const point = grapheme.codePointAt(0) ?? 0;
  return point >= 0x1100 &&
    (point <= 0x115f ||
      point === 0x2329 ||
      point === 0x232a ||
      (point >= 0x2e80 && point <= 0xa4cf && point !== 0x303f) ||
      (point >= 0xac00 && point <= 0xd7a3) ||
      (point >= 0xf900 && point <= 0xfaff) ||
      (point >= 0xfe10 && point <= 0xfe19) ||
      (point >= 0xfe30 && point <= 0xfe6f) ||
      (point >= 0xff00 && point <= 0xff60) ||
      (point >= 0xffe0 && point <= 0xffe6) ||
      (point >= 0x20000 && point <= 0x3fffd))
    ? 2
    : 1;
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
