const characters = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const words = new Intl.Segmenter(undefined, { granularity: "word" });
export type SelectionUnit = "character" | "word" | "line";

export function wordBoundary(
  value: string,
  cursor: number,
  direction: number,
): number {
  const segments = Array.from(words.segment(value)).filter(
    (part) => part.isWordLike,
  );
  return direction < 0
    ? (segments.findLast((part) => part.index < cursor)?.index ?? 0)
    : (segments
        .map((part) => part.index + part.segment.length)
        .find((end) => end > cursor) ?? value.length);
}
export function lineRange(value: string, cursor: number): [number, number] {
  const start = cursor > 0 ? value.lastIndexOf("\n", cursor - 1) + 1 : 0;
  const newline = value.indexOf("\n", cursor);
  return [start, newline < 0 ? value.length : newline + 1];
}
export function selectionRange(
  value: string,
  cursor: number,
  unit: SelectionUnit,
): [number, number] {
  if (unit === "line") return lineRange(value, cursor);
  const segments = (unit === "word" ? words : characters).segment(value);
  for (const part of segments)
    if (part.index <= cursor && part.index + part.segment.length > cursor)
      return [part.index, part.index + part.segment.length];
  return [value.length, value.length];
}
export function paragraphBoundary(
  value: string,
  cursor: number,
  direction: number,
): number {
  const starts = [
    0,
    ...Array.from(
      value.matchAll(/\n[ \t]*\n/g),
      (match) => (match.index ?? 0) + match[0].length,
    ),
  ];
  return direction < 0
    ? (starts.findLast((start) => start < cursor) ?? 0)
    : (starts.find((start) => start > cursor) ?? value.length);
}
