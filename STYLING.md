# Styling

Elements and `style()` share immutable fluent builders. `.use(a, b)` merges left to right; `.style({ ... })` accepts the equivalent `Style` properties. Run `bun run demo:styles` for a working example.

## Text appearance

`color`, `background`, `bold`, `italic`, `faint` (or `dim`), `underline`, `strikethrough`, and `inverse` control terminal rendition. Boolean attributes accept `false` to clear inherited values. Colors accept ANSI names, RGB tuples, and three- or six-digit hex strings; `null` resets a color to the terminal default.

```ts
text("Completed").strikethrough();
text("Highlighted").inverse();
text("Diagnostic").underline("curly").underlineColor("red");
text("Heading").width("fill").textAlign("center");
```

`underline()` accepts `true`, `false`, `"single"`, `"double"`, `"curly"`, `"dotted"`, or `"dashed"`. Underline shape and color depend on terminal support. Canto emits the requested SGR sequences without a capability probe.

Text appearance and `textAlign` inherit. Text alignment accepts `"left"`, `"center"`, or `"right"` and positions each wrapped line within the inner width using terminal cell widths. It applies to plain text, rich text, inputs, and textareas, including caret and pointer selection coordinates. `align` and `justify` continue to position child boxes.

## Interaction combinations and control parts

Individual states apply in this order: hovered, focused, pressed, disabled. Selection applies to selected source characters. Nested state declarations require every named state; combinations override individual states, with more states taking precedence and equal specificity resolving in declaration order.

```ts
button("Deploy", deploy)
  .focused(style().borderColor("cyan"))
  .hovered(style().focused(style().background("blue")));

input({ placeholder: "Search…" })
  .placeholder(
    style().color("gray").faint(false).focused(style().color("cyan")),
  )
  .selected(style().background("blue"));

scroll(content)
  .scrollbarThumb(style().color("cyan"))
  .scrollbarTrack(style().color("#263445"));
```

Parts merge independently through `.use()` and can appear inside state declarations. Placeholder, scrollbar, and selection styles affect their painted appearance; layout properties in those declarations do not allocate separate boxes. A placeholder remains faint unless its part style clears faint. Both scrollbar parts use `.color()` for their color, since partial thumb cells combine the thumb and track using foreground/background block glyphs. Text attributes on a partly covered cell come from the thumb.

## Spacing and borders

`gap(n)` sets both axis gaps. `columnGap(n)` overrides the horizontal gap used by rows, and `rowGap(n)` overrides the vertical gap used by columns and boxes. A later `gap()` resets both overrides. Measurement, allocation, and border joining use the same effective gap.

`padding(n)`, `padding([vertical, horizontal])`, and `padding([top, right, bottom, left])` set all four sides. `paddingTop`, `paddingRight`, `paddingBottom`, and `paddingLeft` override individual sides; a later `padding()` resets those overrides. All spacing uses nonnegative whole terminal cells, with fractions floored.

`borderTopColor`, `borderRightColor`, `borderBottomColor`, and `borderLeftColor` override `borderColor`. Top and bottom edges own their corner cells. A side color of `null` uses the terminal default.

```ts
box(content)
  .border({
    topLeft: "+",
    topRight: "+",
    bottomLeft: "+",
    bottomRight: "+",
    top: "-",
    right: "|",
    bottom: "=",
    left: "|",
  })
  .borderTopColor("cyan");
```

Every custom glyph must be a single printable grapheme occupying one terminal cell. Custom borders reserve the same space as built-in borders, honor side visibility, and remain separate when `joinBorders()` is enabled because Canto cannot infer junction glyphs for an arbitrary alphabet.

## Translation

`.translate(x, y)` shifts an element and its subtree in terminal cells after normal allocation. Negative offsets are allowed, fractions are floored, and repeated calls replace the offset. The object form is `.style({ translateX: x, translateY: y })`.

Siblings retain their allocated positions and scroll extents retain their measured size. Painting, refs, pointer targets, selection, carets, and focus bounds use translated geometry. Parent clipping still applies; provide enough parent space or use `overflow("visible")` when content should escape a container. Translations accumulate through ordinary descendants; viewport overlay layers retain their own placement and can anchor to translated refs.

## Opacity and terminal theme colors

`.opacity(alpha)` accepts a finite value from zero through one. Zero suppresses painting; one keeps the normal terminal rendition. Intermediate values composite the element and its subtree as a group, including borders and backgrounds. Nested opacity compounds. It does not change sizing, keyboard focus, or pointer eligibility.

Terminals cannot blend glyph shapes, so a fractional fade keeps the foreground glyph and interpolates its colors against the underlying cells. When glyphs differ, its foreground fades toward the underlying background. Selection highlighting is applied after the normal paint pass. Pixel canvases retain their source pixels through group opacity and overlapping translucent surfaces. Visible regions are rasterized at native resolution, with aligned regions copied by row. Kitty places native graphics below terminal text; Sixel falls back to cell rendering only in text-bearing cells. Opaque occlusion crops the affected region instead of degrading the entire image. Terminals without native graphics still use quadrant cells.

The process terminal queries default foreground/background with OSC 10/11 and all sixteen ANSI colors with OSC 4 at startup. Replies are decoded independently of keyboard input and update an immutable per-terminal `theme`; arriving colors trigger repaint without waiting for every reply. Injected terminals can provide a `ColorTheme` through `Terminal.theme`. Named colors use the reported ANSI palette during blending; ordinary opaque ANSI text still follows the terminal's native palette.

For terminals that do not answer, missing colors use the conventional ANSI palette, with default foreground `#c0c0c0` and background `#000000`. Color queries do not read the compositor's wallpaper or desktop transparency, so opacity blends the terminal's reported colors rather than the desktop behind its window.
