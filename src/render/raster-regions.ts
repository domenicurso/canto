import type { Mounted, Rect } from "../runtime/tree";
import type { Screen } from "./screen";

/** Sixel cannot sit behind text, so only its text-bearing cells use the cell renderer. */
export function rasterRegions(
  screen: Screen,
  node: Mounted,
  renderer: "kitty" | "sixel",
): Rect[] {
  const regions: Rect[] = [];
  const identities = new Map<object, number>();
  let previous = new Map<string, Rect>();
  for (let y = 0; y < screen.height; y++) {
    const next = new Map<string, Rect>();
    for (let x = 0; x < screen.width;) {
      if (!eligible(screen, node, { x, y }, renderer)) {
        x++;
        continue;
      }
      const surface = screen.get(x, y)?.pixels?.surface;
      if (!surface) continue;
      if (!identities.has(surface)) identities.set(surface, identities.size);
      const start = x++;
      while (
        x < screen.width &&
        eligible(screen, node, { x, y }, renderer) &&
        screen.get(x, y)?.pixels?.surface === surface
      )
        x++;
      const key = `${start}:${x - start}:${identities.get(surface)}`;
      const existing = previous.get(key);
      if (existing) {
        existing.height++;
        next.set(key, existing);
      } else {
        const rect = { x: start, y, width: x - start, height: 1 };
        regions.push(rect);
        next.set(key, rect);
      }
    }
    previous = next;
  }
  return regions;
}
function eligible(
  screen: Screen,
  node: Mounted,
  point: { x: number; y: number },
  renderer: "kitty" | "sixel",
): boolean {
  const pixels = screen.get(point.x, point.y)?.pixels;
  return pixels?.owner === node && (renderer === "kitty" || !pixels.text);
}
