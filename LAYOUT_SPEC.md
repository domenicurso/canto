# Canto v2 layout contract

This document describes the implemented layout engine. All geometry uses terminal cells, and coordinates are local to the application viewport until the terminal adapter presents a frame.

## Composition and ownership

`overlay({ content, ... })` is a viewport layer: it escapes ancestor clipping and flow, centers by default, and can anchor to a live rectangle with top/bottom start/end placement and an offset. Placement flips when the preferred edge lacks space, then clamps the layer dimensions and position to the viewport. Ordinary content paints first, then behavior layers in `zIndex` and tree order; modal input boundaries are owned by runtime.

`row` lays children left to right. `column` and `box` lay children top to bottom. `overlay` places children at the same origin; later children paint above earlier children unless `zIndex` changes their ordering. Component descriptions introduce a wrapper with the same box model, so styles applied to a component apply to that wrapper.

Children may contain nested arrays, strings, numbers, `null`, `undefined`, or `false`. Strings and numbers become text; absent children consume no space and create no gap. Components use their type and sibling key to preserve mounted identity.

## Box model

Width and height include borders and padding. A present border consumes one cell on each enabled side. Padding lies inside it; background covers the whole outer box. Border color and background override the box's corresponding colors for the border itself.

Padding accepts a number, `[vertical, horizontal]`, or `[top, right, bottom, left]`. Disabled border sides consume no border space. The inner rectangle is clamped to zero when borders and padding exhaust the available size.

A row or column with `joinBorders: true` overlaps enabled facing borders of consecutive flow children by one cell when `gap` is zero. Measurement, automatic minimums, allocation, and placement all subtract the same overlap. Absolute children never participate. A decoration-free component wrapper can expose the border of a single child that fills both axes. Other unbordered containers do not expose descendant borders. Junctions are recomposed at actual shared edges after child painting, preserve rounded exterior corners, and respect clipping and overlays. The visible border owns the shared edge's stroke and colors. A positive gap or a disabled facing edge prevents joining.

Text foreground, bold, italic, underline, and faint inherit. Padding, borders, dimensions, backgrounds, wrapping, positioning, and alignment do not inherit. Painting preserves underlying background colors through transparent child content.

## Dimensions

- A number requests that many cells, including the border and padding.
- `"content"`, also the default, requests intrinsic content size.
- `"fill"` uses remaining main-axis space and defaults to growth weight one.
- A percentage resolves against the parent's definite inner dimension.

Percentage sizing under an unbounded dimension falls back to content sizing. Fill does the same under unbounded measurement. Dimensions are floored and clamped to nonnegative cells.

`minWidth`, `maxWidth`, `minHeight`, and `maxHeight` constrain sizes. Automatic main-axis minimums preserve decoration and at least one cell of text, editor, or scroll content, composed through flow children and gaps. Explicit minimums override this behavior; use zero to permit complete collapse. Maximums default to unbounded and cap automatic minimums. If minimum and maximum conflict, the minimum wins. Parent clipping still limits visible output when a child minimum exceeds its viewport.

## Main-axis allocation

1. Exclude absolute children and reserve `gap` between remaining children.
2. Measure each child. Fill children begin at their minimum; other children begin at their measured size.
3. Divide positive remaining space according to `grow`, respecting maximums.
4. Resolve excess size according to `shrink`, respecting minimums.
5. Apply `justify` to any remaining positive space and place children.

Explicit numeric dimensions default to shrink weight zero; other dimensions default to one. All growth defaults to zero except fill. Explicit grow and shrink override these defaults. Saturated children stop participating in distribution. Remaining integer cells are assigned deterministically in sibling order.

A row measures wrapped child heights again using allocated widths. A column measures children under their available width before height allocation. A minimum that cannot fit produces clipped overflow instead of negative sizes.

## Alignment

`justify` controls positive free space along the main axis: start, center, end, between, around, evenly. Gap remains present in addition to distributed space.

`align` controls the cross axis: start, center, end, stretch. A child can override it with `alignSelf`. Stretch affects content-sized cross dimensions; numeric, percentage, and fill dimensions retain their sizing semantics. Cross-axis sizes still obey minimums and maximums.

## Wrapping and text

Text is segmented into grapheme clusters and measured in terminal columns. Wrapping modes are word, character, and none. Word wrapping moves words where possible and breaks oversized words without inserting hyphens or dropping letters. Explicit newlines are preserved; Windows line endings are normalized.

`maxLines` limits the result. `overflow("ellipsis")` adds an ellipsis when an unwrapped line or line-limited paragraph is truncated. Ellipsis and clipping never split a grapheme. Wide glyphs that cannot fit wholly inside a clip are omitted.

Editors reserve caret space and maintain a visible editing window. Textareas wrap within their inner width and scroll their visible lines to follow the caret. Selection uses editor-specific styles and does not alter layout. Plain text selection defaults off; `selectable` resolves from the nearest explicit declaration on the text node or an ancestor. Button labels never participate. Editor selection remains built in, independently of that policy.

## Overflow and layering

The default overflow is clip. Containers clip descendants to their inner rectangle. `overflow("visible")` permits descendants to draw beyond that container, but ancestor clips and the terminal viewport remain enforced. Scroll regions always clip their contents.

Sibling `zIndex` changes paint order within the parent. Equal values retain sibling order. Subtrees paint together; a grandchild does not escape its parent's stacking order. Pointer hit testing follows the same ordering and clipping as painting.

## Absolute positioning

An absolute child consumes no normal flow space or gap. Top, right, bottom, and left resolve against the parent's inner rectangle. Opposing offsets determine a dimension when no definite explicit dimension is supplied. A left/top offset takes precedence when a definite dimension and both opposing offsets are present.

Absolute children still obey minimums, maximums, ancestor clipping, and sibling stacking order.

## Scrolling

Vertical scrolling measures content at the viewport's width with unbounded height. Horizontal scrolling measures at unbounded width with bounded height. Both-axis scrolling permits unbounded measurement on both axes.

Scrollbars consume a column or row. Automatic gutters reserve space only for overflowing axes; stable gutters reserve it even without overflow. Adding a bar can cause the other axis to overflow, so measurement settles bar reservation before final placement.

Offsets are clamped to content bounds. Vertical and horizontal regions use scalar offsets; both-axis regions use `{ x, y }`. Controlled offsets require `onScroll`; uncontrolled offsets begin at `defaultOffset`. Reserved scrollbar gutters remain outside the content clip. Track and thumb are drawn from the current content extent and offset with eighth-cell Unicode blocks. `scrollbar: "hidden"` suppresses both drawing and gutter reservation, even with a stable gutter.

Virtual lists use the same scrolling primitive with fixed-height spacers and a window of mounted rows. Their item height and viewport height are explicit positive integers.

## Updates and failure boundaries

Geometry invalidation includes dimensions, spacing, borders, alignment, text, wrapping, scrolling configuration, and mounted child identity. Foreground/background and text decoration changes repaint without layout. Offset-only changes translate the previously measured scroll subtree, including nested scroll regions. Text changes with identical wrapped line geometry also avoid layout. Geometry invalidation clears measurements and placements on the affected branch and its ancestors. Unchanged branches reuse measurements for matching constraints and skip placement when their rectangles match; each node retains at most eight measurement constraint combinations. Resize changes constraints and forces placement where rectangles change. Retained painting recomposes damaged rows through the same clipping and stacking rules as a full repaint. Insertion/removal and escaping overflow conservatively damage the viewport.

Non-finite numeric style values and negative spacing/weights/limits are rejected before output commits. Terminal input decoding and stdout writes are outside layout; a layout error causes the app to unmount and release its terminal session.
