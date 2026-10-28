import type { PixelBuffer } from "../element/pixels";
import type { Mounted, Rect } from "../runtime/tree";
import type { RasterPlacement } from "./raster-placement";
import type { Screen } from "./screen";

import { rgb } from "../style/colors";
import { nativeSize, samplePixel } from "./pixel-sampling";

export function rasterize(
  node: Mounted,
  rect: Rect,
  screen: Screen,
  renderer: RasterPlacement["renderer"],
): PixelBuffer {
  const cell = screen.cellSize;
  const source = screen.pixelSources.get(node);
  if (!source) throw new Error("A native canvas must have a pixel buffer.");
  const { width, height } = nativeSize(source, {
    area: node.inner,
    rect,
    cell,
    fit: node.element.data.props.canvas?.fit,
    renderer,
  });
  if (matchesSurface(source, { area: node.inner, rect, width, height }))
    return source;
  const data = new Uint8Array(width * height * 4);
  const target = {
    width: node.inner.width * cell.width,
    height: node.inner.height * cell.height,
    fit: node.element.data.props.canvas?.fit,
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = samplePixel(
        source,
        {
          x:
            (rect.x - node.inner.x) * cell.width +
            ((x + 0.5) * rect.width * cell.width) / width,
          y:
            (rect.y - node.inner.y) * cell.height +
            ((y + 0.5) * rect.height * cell.height) / height,
        },
        target,
        screen.pixelBackgrounds
          .get(node)
          ?.get(
            (rect.y + Math.floor((y * rect.height) / height)) * screen.width +
              rect.x +
              Math.floor((x * rect.width) / width),
          ) ?? rgb(node.style.background),
      );
      data.set([...color, 255], (y * width + x) * 4);
    }
  }
  return { width, height, data };
}

function opaque(source: PixelBuffer): boolean {
  for (let offset = 3; offset < source.data.length; offset += 4)
    if (source.data[offset] !== 255) return false;
  return true;
}

function matchesSurface(
  source: PixelBuffer,
  surface: { area: Rect; rect: Rect; width: number; height: number },
): boolean {
  const { area, rect, width, height } = surface;
  return (
    rect.x === area.x &&
    rect.y === area.y &&
    rect.width === area.width &&
    rect.height === area.height &&
    width === source.width &&
    height === source.height &&
    opaque(source)
  );
}
