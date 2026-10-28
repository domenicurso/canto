import type { Screen } from "../render/screen";
import type { Style } from "../style/types";
import type { FrameStats } from "./frame-stats";
import type { Rect } from "./tree";

import { border } from "../render/border";
import { composite } from "../render/opacity";
import { take, width } from "../text/columns";

const surface: Style = { foreground: "#cbd5e1", background: "#0f172a" };
type Reading = readonly [string, string];
export function paintDebugPanel(
  content: Screen,
  stats: Readonly<FrameStats>,
  rect: Rect,
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
  paintReadings(layer, stats, inner);
  if (rect.width >= 12) {
    layer.put({ ...rect, x: rect.x + 2, height: 1 }, " Debug ", surface, rect);
    layer.put(
      { ...rect, x: rect.x + rect.width - 4, height: 1 },
      " x ",
      surface,
      rect,
    );
  }
  const shown = content.clone();
  composite(shown, layer, rect, 0.88);
  return shown;
}
function paintReadings(
  layer: Screen,
  stats: Readonly<FrameStats>,
  inner: Rect,
): void {
  const ms = (value: number): string => `${value.toFixed(1)} ms`;
  const metric = (value?: number): string =>
    value === undefined ? "—" : ms(value);
  reading(
    layer,
    [`${Math.round(stats.fps)} FPS`, ms(stats.renderTime)],
    inner,
    0,
  );
  reading(
    layer,
    [`#${stats.frame}`, `${layer.width} × ${layer.height}`],
    inner,
    1,
  );
  const left: Reading[] = [
    ["Content", ms(stats.contentTime)],
    [" View", ms(stats.updateTime)],
    [" Style/layout", ms(stats.prepareTime)],
    [" Paint", ms(stats.paintTime)],
    [" Diff", ms(stats.diffTime)],
    ["", ""],
    ["Nodes", Math.round(stats.layoutNodes).toString()],
    ["Painted", Math.round(stats.paintedCells).toString()],
  ];
  const right: Reading[] = [
    ["Inspector", ms(stats.debugTime)],
    ["Encode", metric(stats.encodeTime)],
    ["Write", metric(stats.writeTime ?? stats.presentTime)],
    ["Interval", ms(stats.intervalTime)],
    [
      "Output",
      stats.outputBytes === undefined
        ? "—"
        : `${(stats.outputBytes / 1024).toFixed(1)} KiB`,
    ],
    ["", ""],
    ["Changed", Math.round(stats.contentCellsWritten).toString()],
  ];
  paintColumns(layer, { left, right }, inner);
}
function paintColumns(
  layer: Screen,
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
  left.forEach((value, row) => reading(layer, value, start, row));
  right.forEach((value, row) => reading(layer, value, second, row));
}
function reading(layer: Screen, pair: Reading, rect: Rect, row: number): void {
  if (row >= rect.height) return;
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
}
