# Styles and fluent builders

[API index](README.md) · [Builder](../../src/style/builder.ts) · [Layout methods](../../src/style/layout-builder.ts) · [Decoration methods](../../src/style/decoration-builder.ts) · [Types](../../src/style/types.ts)

`style(): StyleBuilder` creates an empty immutable builder. `Element` inherits the same methods. Each call returns a new value; `.style(value: Readonly<Style>)` merges object properties and `.use(...styles: readonly StyleBuilder[])` merges definitions left to right. The last declaration of a base property wins. `new StyleBuilder(definition?)` also accepts a raw definition, but its representation type isn't a package export; prefer `style()`.

## Dimensions and layout

| Method                                                       | Argument type                       | Notes                     |
| ------------------------------------------------------------ | ----------------------------------- | ------------------------- |
| `width`, `height`                                            | `Dimension`                         | Outer size in cells       |
| `minWidth`, `maxWidth`, `minHeight`, `maxHeight`             | `number`                            | ≥ 0 cells                 |
| `fill()`                                                     | —                                   | Both dimensions: `"fill"` |
| `grow(value = 1)`, `shrink(value = 1)`                       | `number`                            | ≥ 0                       |
| `gap`, `columnGap`, `rowGap`                                 | `number`                            | ≥ 0 cells                 |
| `padding`                                                    | `Padding`                           | ≥ 0 cells                 |
| `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft` | `number`                            | ≥ 0 cells                 |
| `justify`                                                    | `Distribution`                      | Main axis                 |
| `align`, `alignSelf`                                         | `Alignment`                         | Cross axis                |
| `position`                                                   | `"static" \| "absolute"`            |                           |
| `top`, `right`, `bottom`, `left`                             | `number`                            | Cells                     |
| `translate(x, y)`                                            | `number, number`                    | Cells                     |
| `zIndex`                                                     | `number`                            | Sibling paint order       |
| `overflow`                                                   | `"clip" \| "visible" \| "ellipsis"` |                           |
| `wrap`                                                       | `"word" \| "character" \| "none"`   |                           |
| `maxLines`                                                   | `number`                            | ≥ 0                       |
| `joinBorders(value = true)`                                  | `boolean`                           | Zero gap required         |
| `selectable(value = true)`                                   | `boolean`                           | Inherited                 |

Dimensions default to `"content"`, position to `"static"`, and overflow to `"clip"`. Plain-text selection defaults off. `gap()` clears axis overrides, and `padding()` clears side overrides. Translation changes allocated geometry without changing flow; equal `zIndex` values preserve tree order.

```ts
type Dimension = number | "content" | "fill" | `${number}%`;
type Padding =
  | number
  | readonly [number, number]
  | readonly [number, number, number, number];
type Distribution =
  | "start"
  | "center"
  | "end"
  | "between"
  | "around"
  | "evenly";
type Alignment = "start" | "center" | "end" | "stretch";
```

The [layout contract](../reference/layout.md) defines measurement, default weights, automatic minimums, clipping, and inheritance. Non-finite numeric style values and negative spacing, weights, or limits reject before output commits. Geometry uses whole cells; supported fractional geometry values are floored.

## Colors and text

| Method                                                              | Argument type   | Notes              |
| ------------------------------------------------------------------- | --------------- | ------------------ |
| `color`                                                             | `Color \| null` | `foreground`       |
| `background`                                                        | `Color \| null` |                    |
| `bold(value = true)`, `italic(value = true)`, `faint(value = true)` | `boolean`       |                    |
| `dim()`                                                             | —               | `faint(true)`      |
| `strikethrough(value = true)`, `inverse(value = true)`              | `boolean`       |                    |
| `underline(value = true)`                                           | `Underline`     |                    |
| `underlineColor`                                                    | `Color \| null` | Terminal-dependent |
| `textAlign`                                                         | `TextAlignment` |                    |
| `opacity`                                                           | `number`        | 0–1                |

```ts
type Underline = boolean | "single" | "double" | "curly" | "dotted" | "dashed";
type TextAlignment = "left" | "center" | "right";
```

Text attributes inherit; `false` clears an inherited boolean and `null` resets a color. Opacity composites the subtree as a group.

`Color` is a string or readonly RGB tuple `[number, number, number]`. Supported strings are `#rgb`, `#rrggbb`, ANSI names `black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, `gray`, `grey`, and their bright variants `brightBlack` through `brightWhite`. Unsupported color names throw when resolved. `null` resets to the terminal default.

## Borders

| Method                                                                                                           | Argument type   | Notes                     |
| ---------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------- |
| `border`                                                                                                         | `Border`        |                           |
| `borderColor`                                                                                                    | `Color \| null` | Edge foreground           |
| `borderBackground`                                                                                               | `Color \| null` | Edge background           |
| `borderTop(value = true)`, `borderRight(value = true)`, `borderBottom(value = true)`, `borderLeft(value = true)` | `boolean`       | One cell per enabled side |
| `borderTopColor`, `borderRightColor`, `borderBottomColor`, `borderLeftColor`                                     | `Color \| null` | Overrides `borderColor`   |

```ts
type Border =
  | "none"
  | "single"
  | "rounded"
  | "double"
  | "heavy"
  | Readonly<BorderGlyphs>;
```

`BorderGlyphs` requires string fields `topLeft`, `topRight`, `bottomLeft`, `bottomRight`, `top`, `right`, `bottom`, and `left`. Each glyph must be one printable grapheme occupying one cell. Custom borders remain separate under border joining because junction glyphs can't be inferred.

## Interaction variants and parts

`.hovered(builder)`, `.focused(builder)`, `.pressed(builder)`, `.disabled(builder)`, and `.selected(builder)` each take a `StyleBuilder`. Individual control states apply in hovered → focused → pressed → disabled order. Selection applies to selected source characters. Nested combinations require all named states; more specific combinations win, with declaration order breaking ties.

`.placeholder(builder)`, `.scrollbarThumb(builder)`, and `.scrollbarTrack(builder)` style control parts. Parts and variants merge independently through `.use()` and may nest. Layout declarations on painted parts or selection don't allocate boxes. Both scrollbar parts use `.color()` for their paint color.

```ts
import { input, style } from "canto";

export const Search = () =>
  input({ placeholder: "Search…" })
    .placeholder(style().faint(false).focused(style().color("cyan")))
    .selected(style().background("blue"));
```

`Style` contains the object properties corresponding to these methods; `color` maps to `foreground`, `fill` sets width and height, and `translate` sets both translation properties. It doesn't contain state or part properties; use the builder methods for those. `StyleBuilder.definition` exposes the composed representation. See [styling](../reference/styling.md) for inheritance, group opacity, and terminal theme behavior.
