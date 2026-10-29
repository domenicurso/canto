# Canvas and graphics

[API index](README.md) · [Factory](../../src/element/factories.ts) · [Drawing contract](../../src/element/drawing.ts) · [Pixels](../../src/element/pixels.ts)

## canvas

```ts
canvas(
  source: PixelBuffer | ((context: DrawingContext) => void),
  options?: CanvasOptions,
): Element
```

Give canvases explicit dimensions or fill space in a bounded parent. Callback canvases are invalidated each frame because they can read external state; changes to external data still need a scheduled frame. A pixel source borrows its bytes: replace its buffer description when pixels change rather than mutating retained data in place.

## DrawingContext

| Member                                        | Contract                                                             |
| --------------------------------------------- | -------------------------------------------------------------------- |
| `readonly width`, `readonly height`           | Inner drawing dimensions in terminal cells                           |
| `readonly pixelWidth`, `readonly pixelHeight` | Corresponding physical pixel dimensions using terminal cell metrics  |
| `write(x, y, text, style?)`                   | Draw text at local cell coordinates, with optional `Readonly<Style>` |
| `fill(rect, style?)`                          | Fill a local `{ x, y, width, height }` cell rectangle                |
| `pixels(buffer: PixelBuffer)`                 | Add RGBA content; can be mixed with cell drawing                     |

Drawing is clipped through the canvas and its ancestors. Use reported pixel dimensions to render charts at the destination resolution. Callback work runs during painting and should be synchronous.

## PixelBuffer

```ts
interface PixelBuffer {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array | Uint8ClampedArray;
}
```

Dimensions are positive safe integers in pixels; data is row-major RGBA and must contain exactly `width * height * 4` bytes. Invalid shapes throw. Buffers aren't decoded image files: decode PNG or another format in application code first. The PNG dependency used by the image example is example-only.

## CanvasOptions

| Property   | Values                                        | Default and behavior                                                             |
| ---------- | --------------------------------------------- | -------------------------------------------------------------------------------- |
| `fit`      | `"contain"`, `"cover"`, `"fill"`              | `"contain"`; fits use physical cell proportions                                  |
| `renderer` | `"auto"`, `"kitty"`, `"sixel"`, `"quadrants"` | `"auto"`: Kitty → Sixel → quadrants; unsupported requests fall back to quadrants |

Contain preserves aspect ratio inside the destination; cover fills it with cropping; fill stretches. Alpha composites against painted content. Explicit RGB/hex backgrounds give predictable colors; theme queries supply terminal colors for blending when available.

```ts
import { canvas } from "canto";

export const Swatches = () =>
  canvas(
    {
      width: 2,
      height: 1,
      data: new Uint8Array([255, 0, 0, 255, 0, 128, 255, 255]),
    },
    { fit: "contain", renderer: "auto" },
  )
    .width(20)
    .height(6);
```

Native rasters retain clipping, opacity, and stacking. Kitty images sit below terminal text; Sixel falls back to cell rendering in text-bearing cells. Native image IDs belong to the terminal session and are removed on unmount or shutdown. Large animated buffers can require substantial terminal output; [frame stats](diagnostics.md) expose output bytes and presentation time.

See [the graphics guide](../guides/graphics.md), [pixel demo](../../examples/pixels.ts), and [compatibility](../reference/compatibility.md).
