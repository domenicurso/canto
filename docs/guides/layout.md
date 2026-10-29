# Layout and reusable styles

[Documentation](../README.md) · [Layout contract](../reference/layout.md) · [Style API](../api/styles.md)

## Allocate space deliberately

`row()` flows left to right; `column()` and `box()` flow top to bottom. Numeric dimensions include border and padding. `"content"` is intrinsic size, `"fill"` takes remaining space, and percentages resolve against a definite parent inner dimension. Under unbounded measurement, percentages and fill fall back to content sizing.

This complete view gives a sidebar a fixed width and lets the detail pane consume remaining space:

```ts
import { box, row, text, useViewport } from "canto";

export function Workspace() {
  const viewport = useViewport();
  return row(
    box(text("Queue"))
      .width(viewport.width < 60 ? 12 : 24)
      .border("single"),
    box(text("Details")).fill().minWidth(0).border("single"),
  )
    .fill()
    .joinBorders();
}
```

Zero-gap adjacent borders share a cell. Use `.gap(1)` to separate them. Numeric dimensions don't shrink by default; content and fill dimensions do. Explicit `.minWidth(0)` allows a pane to collapse beyond its automatic minimum. See [allocation rules](../reference/layout.md#main-axis-allocation) when constraints compete.

## Align boxes and text separately

`.justify()` distributes positive space along the flow axis, while `.align()` positions children on the cross axis. `.alignSelf()` overrides a parent's cross-axis choice. `.textAlign()` positions glyphs within the text element's inner width; give that element width if you want visible centering.

Text wraps at grapheme boundaries with `"word"`, `"character"`, or `"none"`. Use `.maxLines(n).overflow("ellipsis")` for a bounded preview. Containers clip children by default; `.overflow("visible")` only escapes that container's clip, while ancestor clips still apply.

## Share appearance without mutation

```ts
import { button, style } from "canto";

const action = style()
  .padding([0, 2])
  .border("rounded")
  .focused(style().borderColor("cyan").bold())
  .pressed(style().background("blue"))
  .disabled(style().color("gray").faint());

export const Save = (save: () => void) => button("Save", save).use(action);
```

`.use(a, b)` merges left to right, and later base declarations win. State variants merge independently and override base values when active. Text appearance inherits; dimensions, borders, padding, and backgrounds don't. Clear inherited boolean attributes with `false` and reset colors with `null`.

## Position badges and viewport layers

`.position("absolute")` removes a child from flow; its offsets use the parent's inner rectangle. `.translate(x, y)` shifts already allocated geometry without changing siblings or scroll extent. Both obey ancestor clipping. For a dialog or menu that must escape clipping, use a behavioral [overlay](overlays.md).

See [the styling reference](../reference/styling.md) for nested interaction states, editor placeholders, scrollbar parts, per-side borders, and group opacity. Run [`examples/layout.ts`](../../examples/layout.ts) and [`examples/styles.ts`](../../examples/styles.ts) to inspect the behavior interactively.
