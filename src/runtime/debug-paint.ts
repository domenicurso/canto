import type { Screen } from "../render/screen";
import type { Style } from "../style/types";
import type { Reading } from "./debug-readings";
import type { DebugReadings } from "./debug-sampling";
import type { DebugTooltip } from "./debug-tooltip";
import type { Rect } from "./tree";

import { border } from "../render/border";
import { composite } from "../render/opacity";
import { take, width } from "../text/columns";
import { debugReadings } from "./debug-readings";

const surface: Style = { foreground: "#cbd5e1", background: "#0f172a" };
interface DiagnosticPaint {
  layer: Screen;
  tooltip: DebugTooltip;
}
export function paintDebugPanel(
  content: Screen,
  stats: DebugReadings,
  rect: Rect,
  tooltip: DebugTooltip,
): Screen {
  const layer = content.clone();
  for (let y = rect.y; y < rect.y + rect.height; y++)
    layer.put({ ...rect, y, height: 1 }, " ".repeat(rect.width), surface, rect);
  border(
    { rect, style: { ...surface, border: "rounded", borderColor: "#475569" } },
    layer,
    rect,
  );
  const inner = {
    x: rect.x + 2,
    y: rect.y + 1,
    width: Math.max(0, rect.width - 4),
    height: Math.max(0, rect.height - 2),
  };
  tooltip.begin();
  const readings = debugReadings(stats, layer);
  const paint = { layer, tooltip };
  readings.header.forEach((value, row) => reading(paint, value, inner, row));
  paintColumns(paint, readings, inner);
  if (rect.width >= 12) {
    layer.put({ ...rect, x: rect.x + 1, height: 1 }, " Debug ", surface, rect);
    layer.put(
      { ...rect, x: rect.x + rect.width - 4, height: 1 },
      " x ",
      surface,
      rect,
    );
  }
  const shown = content.clone();
  composite(shown, layer, rect, 0.88);
  tooltip.paint(shown);
  return shown;
}
function paintColumns(
  paint: DiagnosticPaint,
  values: { left: Reading[]; right: Reading[] },
  inner: Rect,
): void {
  const { left, right } = values;
  const columns = inner.width >= 46;
  const columnWidth = columns ? Math.floor((inner.width - 3) / 2) : inner.width;
  const start = {
    ...inner,
    width: columnWidth,
    y: inner.y + 3,
    height: Math.max(0, inner.height - 3),
  };
  const second = columns
    ? { ...start, x: start.x + columnWidth + 3 }
    : {
        ...start,
        y: start.y + left.length,
        height: Math.max(0, start.height - left.length),
      };
  left.forEach((value, row) => reading(paint, value, start, row));
  right.forEach((value, row) => reading(paint, value, second, row));
}
function reading(
  paint: DiagnosticPaint,
  pair: Reading,
  rect: Rect,
  row: number,
): void {
  if (row >= rect.height) return;
  const { layer, tooltip } = paint;
  const value = take(pair[1], rect.width);
  const label = take(pair[0], Math.max(0, rect.width - width(value) - 1));
  layer.put(
    { ...rect, y: rect.y + row },
    label,
    { ...surface, foreground: row === 0 ? "#f8fafc" : "#94a3b8" },
    rect,
  );
  layer.put(
    { ...rect, x: rect.x + rect.width - width(value), y: rect.y + row },
    value,
    { ...surface, foreground: "#67e8f9" },
    rect,
  );
  const name = label.trimStart();
  if (pair[2] && name)
    tooltip.label(
      {
        x: rect.x + width(label) - width(name),
        y: rect.y + row,
        width: width(name),
        height: 1,
      },
      pair[2],
    );
}
