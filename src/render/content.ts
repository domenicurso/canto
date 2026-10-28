import type { Mounted, Rect } from "../runtime/tree";
import type { Screen } from "./screen";

import { validatePixels } from "../element/pixels";
import { intersect } from "../layout/geometry";
import { textOffset } from "../text/alignment";
import { width as displayWidth, sanitize } from "../text/columns";
import { drawPixels } from "./quadrants";

export function drawContent(node: Mounted, screen: Screen, clip: Rect): void {
  screen.pixelSources.delete(node);
  drawPixels(node, screen, clip);
  const draw = node.element.data.draw;
  const area = node.inner;
  if (draw)
    draw({
      pixelWidth: Math.round(area.width * screen.cellSize.width),
      pixelHeight: Math.round(area.height * screen.cellSize.height),
      pixels: (buffer) => {
        validatePixels(buffer);
        drawPixels(node, screen, clip, buffer);
      },
      width: area.width,
      height: area.height,
      write: (x, y, text, style = {}) => {
        screen.put(
          { x: area.x + x, y: area.y + y, width: area.width, height: 1 },
          sanitize(text),
          { ...node.style, ...style },
          clip,
        );
      },
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
    drawPlainText(node, screen, clip);
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
    let x =
      node.inner.x + textOffset(line, node.inner.width, node.style.textAlign);
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

function drawPlainText(node: Mounted, screen: Screen, clip: Rect): void {
  const style = { ...node.style, ...node.element.data.runs?.[0]?.style };
  node.lines.forEach((line, index) =>
    screen.put(
      {
        ...node.inner,
        x:
          node.inner.x +
          textOffset(line, node.inner.width, node.style.textAlign),
        y: node.inner.y + index,
      },
      line,
      style,
      clip,
    ),
  );
}
