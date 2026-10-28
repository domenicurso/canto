import { graphemes, take, width } from "./columns";

export function boundary(value: string, cursor: number, direction: number): number {
  const positions = [0];
  for (const part of graphemes(value)) positions.push((positions.at(-1) ?? 0) + part.length);
  return direction < 0
    ? (positions.filter((position) => position < cursor).at(-1) ?? 0)
    : (positions.find((position) => position > cursor) ?? value.length);
}
export function vertical(value: string, cursor: number, direction: number): number {
  const start = value.lastIndexOf("\n", cursor - 1) + 1;
  const column = width(value.slice(start, cursor));
  if (direction < 0) {
    if (!start) return cursor;
    const previous = value.lastIndexOf("\n", start - 2) + 1;
    return previous + take(value.slice(previous, start - 1), column).length;
  }
  const end = value.indexOf("\n", cursor);
  if (end < 0) return cursor;
  return end + 1 + take(value.slice(end + 1).split("\n")[0] ?? "", column).length;
}
