# Canvas and pixel graphics

[Documentation](../README.md)

`canvas(draw)` provides cell dimensions, `write(x, y, text, style)`, and `fill(rect, style)`. For pixels, pass a row-major RGBA buffer directly or call `draw.pixels(buffer)` from the callback:

```ts
canvas(
  {
    width: 2,
    height: 1,
    data: new Uint8Array([255, 0, 0, 255, 0, 128, 255, 255]),
  },
  { fit: "contain", renderer: "auto" },
).fill();

canvas(
  (draw) => {
    // Render at the reported terminal pixel resolution instead of stretching a small bitmap.
    if (draw.pixelWidth && draw.pixelHeight)
      draw.pixels(renderChart(draw.pixelWidth, draw.pixelHeight));
  },
  { fit: "fill" },
).fill();
```

`PixelBuffer` borrows its RGBA bytes; replace the buffer description when pixels change. `draw.pixelWidth` and `pixelHeight` follow the inner cell dimensions and terminal cell metrics, including resize. Give canvases explicit sizes or fill dimensions. Fits are `"contain"` (default), `"cover"`, and `"fill"`; they use physical cell proportions. Alpha composites against the painted background. Set an explicit hex or RGB background for predictable colors; named ANSI colors use the reported terminal palette when available, with a conventional palette and black background as fallbacks.

The process adapter probes graphics support, then chooses Kitty → Sixel → Unicode quadrant blocks. `renderer` can request `"kitty"`, `"sixel"`, or `"quadrants"`; unsupported requests fall back to quadrants. Sixel uses a 216-color palette. Native rasters are cropped into visible regions; opacity and translucent overlays composite pixel surfaces before encoding. Kitty places images beneath text, while Sixel uses cell rendering only where text overlaps an image. Callbacks can mix pixels and cell drawing. Kitty skips quadrant conversion when native graphics are available. Native image IDs belong to the terminal session and are deleted on unmount or shutdown. Kitty uploads use lossless compression, unchanged images retain their data, replacements are placed before old images are removed, and frames use synchronized output to avoid exposing partial updates. A new buffer still requires a native upload; large animated canvases have terminal-dependent throughput.

The snippets are fragments; `renderChart(width, height)` is an application-supplied RGBA renderer. See [canvas signatures](../api/graphics.md) and [runnable pixel example](../../examples/pixels.ts).
