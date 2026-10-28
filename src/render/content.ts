import type { Mounted, Rect } from "../runtime/tree";
import type { Screen } from "./screen";

import { intersect } from "../layout/geometry";
import { width as displayWidth, sanitize } from "../text/columns";

export function drawContent(node: Mounted, screen: Screen, clip: Rect): void {
  const draw = node.element.data.draw;
  const area = node.inner;
  if (draw)
    draw({
      width: area.width,
      height: area.height,
      write: (x, y, text, style = {}) =>
        screen.put(
          { x: area.x + x, y: area.y + y, width: area.width, height: 1 },
          sanitize(text),
          { ...node.style, ...style },
          clip,
        ),
      fill: (rect, style = {}) => {
        const bounds = intersect(clip, {
          ...rect,
          x: area.x + rect.x,
          y: area.y + rect.y,
        });
        for (let y = bounds.y; y < bounds.y + bounds.height; y++)
          screen.put(
            { ...bounds, y },
            " ".repeat(bounds.width),
            { ...node.style, ...style },
            clip,
          );
      },
    });
}
export function drawText(node: Mounted, screen: Screen, clip: Rect): void {
  const runs = node.element.data.runs;
  if (!runs || runs.length < 2) {
    const style = { ...node.style, ...runs?.[0]?.style };
    node.lines.forEach((line, index) =>
      screen.put({ ...node.inner, y: node.inner.y + index }, line, style, clip),
    );
    return;
  }
  const spans = runs.map((run) => ({ ...run, text: sanitize(run.text) }));
  const original = spans.map((run) => run.text).join("");
  let offset = 0;
  for (const [row, line] of node.lines.entries()) {
    const truncated = line.endsWith("…") && node.style.overflow === "ellipsis";
    const source = truncated ? line.slice(0, -1) : line;
    const found = original.indexOf(source, offset);
    const start = found < 0 ? offset : found;
    let position = 0;
    let x = node.inner.x;
    for (const run of spans) {
      const end = position + run.text.length;
      const part = run.text.slice(
        Math.max(0, start - position),
        Math.max(0, Math.min(end, start + source.length) - position),
      );
      if (part) {
        screen.put(
          { x, y: node.inner.y + row, width: node.inner.width, height: 1 },
          part,
          { ...node.style, ...run.style },
          clip,
        );
        x += displayWidth(part);
      }
      position = end;
    }
    if (truncated)
      screen.put(
        { x, y: node.inner.y + row, width: 1, height: 1 },
        "…",
        node.style,
        clip,
      );
    offset = start + source.length;
  }
}
