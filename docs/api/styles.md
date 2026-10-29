# Styles and fluent builders

[API index](README.md) · [Builder](../../src/style/builder.ts) · [Layout methods](../../src/style/layout-builder.ts) · [Decoration methods](../../src/style/decoration-builder.ts) · [Types](../../src/style/types.ts)

`style(): StyleBuilder` creates an empty immutable builder. `Element` inherits the same methods. Each call returns a new value; `.style(value: Readonly<Style>)` merges object properties and `.use(...styles: readonly StyleBuilder[])` merges definitions left to right. The last declaration of a base property wins. `new StyleBuilder(definition?)` also accepts a raw definition, but its representation type isn't a package export; prefer `style()`.

## Dimensions and layout

| Methods                                                      | Accepted values and meaning                                                              |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `width`, `height`                                            | `Dimension`: number, `"content"` (default), `"fill"`, or a percentage string             |
| `minWidth`, `maxWidth`, `minHeight`, `maxHeight`             | Nonnegative cell limits; minimum wins a conflict                                         |
| `fill()`                                                     | Sets both dimensions to `"fill"`                                                         |
| `grow(value = 1)`, `shrink(value = 1)`                       | Nonnegative allocation weights                                                           |
| `gap(number)`, `columnGap(number)`, `rowGap(number)`         | Nonnegative cell spacing; `gap` clears axis overrides                                    |
| `padding(Padding)`                                           | Number, `[vertical, horizontal]`, or `[top, right, bottom, left]`; clears side overrides |
| `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft` | Nonnegative side-specific cell spacing                                                   |
| `justify(Distribution)`                                      | `"start"`, `"center"`, `"end"`, `"between"`, `"around"`, `"evenly"`                      |
| `align(Alignment)`, `alignSelf(Alignment)`                   | `"start"`, `"center"`, `"end"`, `"stretch"`                                              |
| `position(value)`                                            | `"static"` (default) or `"absolute"`                                                     |
| `top`, `right`, `bottom`, `left`                             | Numeric offsets in cells                                                                 |
| `translate(x, y)`                                            | Numeric cell translation after allocation; maps to `translateX` / `translateY`           |
| `zIndex(number)`                                             | Sibling paint order; ties preserve tree order                                            |
| `overflow(value)`                                            | `"clip"` (default), `"visible"`, `"ellipsis"`                                            |
| `wrap(value)`                                                | `"word"`, `"character"`, `"none"`                                                        |
| `maxLines(number)`                                           | Nonnegative line limit                                                                   |
| `joinBorders(value = true)`                                  | Joins eligible adjacent borders at zero gap                                              |
| `selectable(value = true)`                                   | Inherited plain-text selection policy; default off                                       |

The [layout contract](../reference/layout.md) defines measurement, default weights, automatic minimums, clipping, and inheritance. Non-finite numeric style values and negative spacing, weights, or limits reject before output commits. Geometry uses whole cells; supported fractional geometry values are floored.

## Colors and text

| Methods                                                             | Accepted values and meaning                                                     |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `color(Color \| null)`                                              | Sets `Style.foreground`                                                         |
| `background(Color \| null)`                                         | Background color                                                                |
| `bold(value = true)`, `italic(value = true)`, `faint(value = true)` | Boolean rendition; false clears inheritance                                     |
| `dim()`                                                             | Equivalent to `faint()`                                                         |
| `strikethrough(value = true)`, `inverse(value = true)`              | Boolean rendition                                                               |
| `underline(value = true)`                                           | `Underline`: boolean, `"single"`, `"double"`, `"curly"`, `"dotted"`, `"dashed"` |
| `underlineColor(Color \| null)`                                     | Underline color; terminal support varies                                        |
| `textAlign(TextAlignment)`                                          | `"left"`, `"center"`, `"right"`; aligns lines within inner width                |
| `opacity(number)`                                                   | Finite alpha from 0 through 1; composites the subtree as a group                |

`Color` is a string or readonly RGB tuple `[number, number, number]`. Supported strings are `#rgb`, `#rrggbb`, ANSI names `black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, `gray`, `grey`, and their bright variants `brightBlack` through `brightWhite`. Unsupported color names throw when resolved. `null` resets to the terminal default.

## Borders

| Methods                                                                      | Accepted values and meaning                                                           |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `border(Border)`                                                             | `"none"`, `"single"`, `"rounded"`, `"double"`, `"heavy"`, or `Readonly<BorderGlyphs>` |
| `borderColor(Color \| null)`                                                 | Default edge foreground                                                               |
| `borderBackground(Color \| null)`                                            | Edge background                                                                       |
| `borderTop(value = true)`, `borderRight`, `borderBottom`, `borderLeft`       | Enable sides, each consuming one cell                                                 |
| `borderTopColor`, `borderRightColor`, `borderBottomColor`, `borderLeftColor` | Per-side `Color \| null` overriding `borderColor`                                     |

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
