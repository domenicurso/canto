import type { Rect } from "../../layout/geometry";
import type { Mounted } from "../../runtime/components/tree";
import type { Screen } from "../screen";

import { validatePixels } from "../../element/graphics/pixels";
import { intersect } from "../../layout/geometry";
import { textOffset } from "../../text/alignment";
import { width as displayWidth, sanitize } from "../../text/columns";
import { drawPixels } from "../graphics/quadrants";

export function drawContent(node: Mounted, screen: Screen, clip: Rect): void {
  screen.pixelSources.delete(node);
  drawPixels(node, screen, clip);
  const draw = node.element.data.draw;
  const area = node.layout.inner;
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
          { ...node.layout.style, ...style },
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
            { ...node.layout.style, ...style },
            clip,
          );
      },
    });
}
export function drawText(node: Mounted, screen: Screen, clip: Rect): void {
  const { inner, style, lines } = node.layout;
  const runs = node.element.data.runs;
  if (!runs || runs.length < 2) {
    drawPlainText(node, screen, clip);
    return;
  }
  const spans = runs.map((run) => ({ ...run, text: sanitize(run.text) }));
  const original = spans.map((run) => run.text).join("");
  let offset = 0;
  for (const [row, line] of lines.entries()) {
    const truncated = line.endsWith("…") && style.overflow === "ellipsis";
    const source = truncated ? line.slice(0, -1) : line;
    const found = original.indexOf(source, offset);
    const start = found < 0 ? offset : found;
    let position = 0;
    let x = inner.x + textOffset(line, inner.width, style.textAlign);
    for (const run of spans) {
      const end = position + run.text.length;
      const part = run.text.slice(
        Math.max(0, start - position),
        Math.max(0, Math.min(end, start + source.length) - position),
      );
      if (part) {
        screen.put(
          {
            x,
            y: inner.y + row,
            width: inner.width,
            height: 1,
          },
          part,
          { ...style, ...run.style },
          clip,
        );
        x += displayWidth(part);
      }
      position = end;
    }
    if (truncated)
      screen.put(
        { x, y: inner.y + row, width: 1, height: 1 },
        "…",
        style,
        clip,
      );
    offset = start + source.length;
  }
}

function drawPlainText(node: Mounted, screen: Screen, clip: Rect): void {
  const style = { ...node.layout.style, ...node.element.data.runs?.[0]?.style };
  node.layout.lines.forEach((line, index) =>
    screen.put(
      {
        ...node.layout.inner,
        x:
          node.layout.inner.x +
          textOffset(
            line,
            node.layout.inner.width,
            node.layout.style.textAlign,
          ),
        y: node.layout.inner.y + index,
      },
      line,
      style,
      clip,
    ),
  );
}
