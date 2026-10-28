import type { CanvasOptions, PixelBuffer } from "../element/pixels";
import type { Rect } from "../runtime/tree";
import type { RGB } from "../style/colors";
import type { CellSize } from "../terminal/cell-size";

export function samplePixel(
  buffer: PixelBuffer,
  point: { x: number; y: number },
  target: { width: number; height: number; fit?: CanvasOptions["fit"] },
  background: RGB,
): RGB {
  const sx = target.width / buffer.width,
    sy = target.height / buffer.height;
  const scale = target.fit === "cover" ? Math.max(sx, sy) : Math.min(sx, sy);
  const width = target.fit === "fill" ? target.width : buffer.width * scale;
  const height = target.fit === "fill" ? target.height : buffer.height * scale;
  const x = Math.floor(
    ((point.x - (target.width - width) / 2) * buffer.width) / width,
  );
  const y = Math.floor(
    ((point.y - (target.height - height) / 2) * buffer.height) / height,
  );
  if (x < 0 || y < 0 || x >= buffer.width || y >= buffer.height)
    return background;
  const offset = (y * buffer.width + x) * 4;
  const alpha = (buffer.data[offset + 3] ?? 0) / 255;
  const blend = (channel: number): number =>
    Math.round(
      (buffer.data[offset + channel] ?? 0) * alpha +
        (background[channel] ?? 0) * (1 - alpha),
    );
  return [blend(0), blend(1), blend(2)];
}

export function nativeSize(
  source: PixelBuffer,
  options: {
    area: Rect;
    rect: Rect;
    cell: CellSize;
    fit?: CanvasOptions["fit"];
    renderer: "kitty" | "sixel";
  },
): { width: number; height: number } {
  const { area, rect, cell, fit, renderer } = options;
  const sx = source.width / (area.width * cell.width),
    sy = source.height / (area.height * cell.height);
  const density =
    renderer === "sixel"
      ? 1
      : Math.min(1, fit === "cover" ? Math.min(sx, sy) : Math.max(sx, sy));
  const dx = renderer === "kitty" && fit === "fill" ? Math.min(1, sx) : density;
  const dy = renderer === "kitty" && fit === "fill" ? Math.min(1, sy) : density;
  return {
    width: Math.max(1, Math.round(rect.width * cell.width * dx)),
    height: Math.max(1, Math.round(rect.height * cell.height * dy)),
  };
}
