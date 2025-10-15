# Canto Layout Engine Spec

This document defines the second-generation (v2) layout model for Canto. It is self-contained and assumes no familiarity with previous Canto releases or any other layout system. The specification covers the observable behavior that renderers MUST provide and the mental model that authors rely on when composing interfaces.

## Introduction

Canto renders user interfaces on top of a discrete grid of character cells. Every visual element occupies an axis-aligned rectangle on this grid. Layout decides where those rectangles appear and how large they are.

The v2 model revolves around _stacks_—containers that position children along one axis at a time. Complex layouts emerge by nesting stacks; there is no implicit two-dimensional flow. The goal is to let authors express **intent** (hug, fill, lock) instead of thinking in low-level mechanics.

### Normative language

- **MUST / MUST NOT** denote strict requirements.
- **SHOULD / SHOULD NOT** denote recommendations; deviations require justification.
- **MAY** denotes optional behavior.

All requirements are normative unless marked otherwise.

## Coordinate system & terminology

- **Cell:** Smallest addressable unit. Widths and heights are whole numbers of cells.
- **Point:** `(x, y)` measured from the top-left origin. `x` increases to the right; `y` increases downward.
- **Rect:** `(x, y, width, height)` describing a widget’s position and size in cells.
- **Widget:** Any participant in the layout tree. Widgets expose a common interface for measurement, layout, and painting.
- **Container widget:** A widget that owns child widgets and runs the stack layout algorithm (e.g., `HStack`, `VStack`).
- **Leaf widget:** A widget with no layout-visible children. It reports intrinsic size and renders content (e.g., `Text`, `Input`).
- **Flow axis / main axis:** Axis along which a container positions its children sequentially.
- **Cross axis:** Axis perpendicular to the flow axis.
- **Flow start / flow end:** Leading and trailing directions on the flow axis.
- **Cross start / cross end:** Leading and trailing directions on the cross axis.
- **Intrinsic size:** Natural size of a widget when measured with tight constraints that allow its content to be rendered without clipping.
- **Constraints:** Inclusive `[minWidth, maxWidth]` and `[minHeight, maxHeight]` ranges supplied during measurement. `max*` MAY be `+∞`. A widget MUST return a size within these bounds.
- **Basis:** Provisional flow-axis size for an item before growing or shrinking.
- **Free space:** Inner flow-axis size minus the sum of bases plus gaps. May be positive (slack) or negative (overflow).

Every widget MUST record the rect it occupies. Container widgets additionally track the rects of their children.

## Widget taxonomy

All widgets share a common lifecycle:

1. **Measure:** Given constraints, return an acceptable size.
2. **Layout:** Given an origin and final size, position self and (if applicable) children.
3. **Paint:** Produce draw commands for the renderer.

Two specializations exist:

- **Container widgets** inherit from a base container class and implement stack layout semantics for their children. They MAY provide additional behavior (scrolling, focus, etc.) but MUST honor this specification when arranging children.
- **Leaf widgets** implement only the intrinsic measurement and drawing logic. They MAY own internal data structures but are invisible to layout aside from their reported size.

All author-visible components are widgets. Custom widgets SHOULD declare whether they behave as containers or leaves so that tooling can reason about composition.

### Built-in Container Widgets

- `Stack`: Implements a stack layout for its children. Children are positioned one after another along the flow axis.
- `HStack`: Flow axis is horizontal (flow start = left, flow end = right). Cross axis is vertical (wraps `Stack` with `flow="x"`).
- `VStack`: Flow axis is vertical (flow start = top, flow end = bottom). Cross axis is horizontal (wraps `Stack` with `flow="y"`).
- `Scrollable`: Acts as a container that allows its content to be scrolled within a fixed confine.

### Built-in Leaf Widgets

- `Text`: Displays text content.
- `Input`: Accepts user input on a single line.
- `TextArea`: Accepts user input on multiple lines.
- `Button`: Executes a callback when clicked.

## Dimension tokens

Dimension tokens express sizing intent per axis. When combined with optional weights (`grow`, `shrink`), they determine how space is allocated.

| Token        | Basis on flow axis                                | Default grow | Default shrink | Cross-axis behavior                                                  | Description                               |
| ------------ | ------------------------------------------------- | ------------ | -------------- | -------------------------------------------------------------------- | ----------------------------------------- |
| `hug`        | Intrinsic measurement within supplied constraints | `0`          | `0`            | Keeps intrinsic size; ignores cross-axis stretching.                 | Match content exactly.                    |
| `lock`       | Intrinsic measurement                             | `0`          | `0`            | Locks both axes to intrinsic size regardless of alignment.           | Fixed to content; position only.          |
| `auto`       | Intrinsic measurement                             | `0`          | `0`            | May expand to fill cross-axis space when alignment requests stretch. | Hug on flow axis, flexible cross axis.    |
| `fill`       | `0`                                               | `1`          | `1`            | Honors cross-axis alignment (stretch allowed).                       | Share leftover room with peers.           |
| `<number>`   | Literal value in cells                            | `0`          | `0`            | Uses alignment for positioning; no implicit stretching.              | Absolute size.                            |
| `<number>%`  | Percentage of the container’s inner flow size     | `0`          | `1`            | Uses alignment for positioning; subject to cross-axis constraints.   | Proportional share of container.          |
| `<number>fr` | `0`                                               | Weight = `N` | `1`            | Uses alignment for positioning; subject to cross-axis constraints.   | Fractional share of remaining free space. |

Rules:

- Tokens apply independently to width and height.
- Authors MAY override `grow` and `shrink` weights explicitly (non-negative numbers). Omitted weights fall back to the defaults above.
- Percentages require a known inner flow size. If the size is unbounded (`+∞`), treat the basis as `0` during the first pass while retaining the default shrink weight. Ancestors MUST re-run layout once a concrete size is known.
- `fr` units participate only when free space is positive; shrinkage is handled separately via shrink weights.
- Tokens MAY appear in `min*`/`max*` properties. When used there, resolve the token at clamp time using the same rules.

---

## Distribution & alignment

Stack layout distinguishes between _distribution_ along the flow axis and _alignment_ along the cross axis.

### Flow distribution modes

| Mode      | Meaning                                                                                                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `start`   | Place children from the flow start with no extra spacing.                                                                                                                            |
| `center`  | Center the group within the available flow space. Extra cells are placed toward flow end.                                                                                            |
| `end`     | Place children flush with the flow end.                                                                                                                                              |
| `between` | “Space-between”: divide remaining flow space evenly between gaps. Leading and trailing edges receive no extra space. Requires at least two children; otherwise behaves like `start`. |
| `around`  | “Space-around”: divide remaining flow space into `childCount` slots, adding equal space before the first child, between children, and after the last child.                          |

Flow distribution modes NEVER include `stretch`; flow-axis stretching is handled by the grow phase.

### Cross-axis alignment keywords

| Keyword   | Meaning                                                                                                        |
| --------- | -------------------------------------------------------------------------------------------------------------- |
| `start`   | Align items to cross start.                                                                                    |
| `center`  | Center items across the cross axis (extra cell bias to cross end).                                             |
| `end`     | Align items to cross end.                                                                                      |
| `stretch` | Expand items to fill the inner cross size, bounded by their `min`/`max`. Items using `lock` ignore stretching. |

---

## Container configuration

Stacks expose the following properties:

| Prop        | Type / Token                                                         | Description                                                                    |
| ----------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `flow`      | `"x"` or `"y"`                                                       | Internal discriminator (`HStack` fixes `"x"`, `VStack` fixes `"y"`).           |
| `gap`       | `number` (≥ 0)                                                       | Cells inserted between consecutive children on the flow axis.                  |
| `padding`   | `number` \| `[vertical, horizontal]` \| `[top, right, bottom, left]` | Extra space around the content.                                                |
| `width`     | Dimension token                                                      | Desired outer width.                                                           |
| `height`    | Dimension token                                                      | Desired outer height.                                                          |
| `minWidth`  | Dimension token \| `"none"`                                          | Optional lower width bound (`"none"` removes the bound).                       |
| `minHeight` | Dimension token \| `"none"`                                          | Optional lower height bound.                                                   |
| `maxWidth`  | Dimension token \| `"none"`                                          | Optional upper width bound.                                                    |
| `maxHeight` | Dimension token \| `"none"`                                          | Optional upper height bound.                                                   |
| `disribute` | `start` \| `center` \| `end` \| `between` \| `around`                | How children are distributed along the flow axis after sizing.                 |
| `align`     | `start` \| `center` \| `end` \| `stretch`                            | How children align along the cross axis when no per-item override is provided. |

Semantics:

- Resolve the container’s outer width/height first using its dimension tokens and the parent constraints. The result is the **outer rect**.
- Subtract padding to obtain the **inner rect** where children are placed. Inner sizes are clamped to zero when padding exceeds the outer size.
- `distribute` only affects leftover flow-axis space; item sizes are determined by the grow/shrink pipeline. `between` requires at least two children; otherwise treat it as `start`. `around` always applies, even with a single child (leading and trailing space are both equal).
- `align = stretch` asks eligible children (those not using `lock` and whose cross-axis tokens permit expansion) to fill the cross-axis inner size. Other keywords adjust position without changing size.
- If authors supply `between` or `around` to per-item overrides, implementations MUST treat them as `start` and SHOULD emit a diagnostic.

---

## Item configuration

Items inherit container defaults but MAY override:

| Prop                    | Description                                                                  |
| ----------------------- | ---------------------------------------------------------------------------- |
| `width`, `height`       | Dimension tokens per axis.                                                   |
| `minWidth`, `minHeight` | Optional lower bounds (`"none"` removes the bound).                          |
| `maxWidth`, `maxHeight` | Optional upper bounds (`"none"` removes the bound).                          |
| `grow`                  | Explicit grow weight (≥ 0).                                                  |
| `shrink`                | Explicit shrink weight (≥ 0).                                                |
| `disribute`             | Optional override for flow placement. Accepts `start`, `center`, or `end`.   |
| `align`                 | Optional override for cross placement (`start`, `center`, `end`, `stretch`). |

Rules:

- Omitted properties defer to the container.
- Widgets using `lock` MUST ignore `grow`, `shrink`, `stretch`, `between`, and `around`.
- Items MUST respect `min*`/`max*` even when alignment requests stretching.
- Negative weights are invalid; implementations SHOULD warn and clamp them to `0`.

---

## Layout pipeline

Container widgets perform layout in two deterministic stages: **measurement** (compute their own size for given constraints) and **layout** (assign rects to children).

### 1. Measurement pass

Input: parent constraints, inherited style, and children.

1. **Resolve container dimensions.** Convert `width`/`height` tokens into candidate outer sizes using dimension token rules.
2. **Clamp to bounds.** Apply the container’s own `min*`/`max*` (resolving tokens as necessary) and limit sizes to the parent constraints. This yields the outer size.
3. **Compute inner constraints.** Subtract padding to produce inner width/height (clamped to ≥ 0). Provide each child with constraints `{ minWidth: 0, maxWidth: innerWidth, minHeight: 0, maxHeight: innerHeight }`.
4. **Measure children.** Invoke each child’s measurement with the inner constraints. Record the intrinsic sizes they return.
5. **Intrinsic container size.**
   - Flow axis: sum of child flow sizes plus total gaps, then add padding.
   - Cross axis: maximum child cross size plus padding.
6. **Reconcile container tokens.** If `width` or `height` token is `hug` or `auto`, use the intrinsic result. Otherwise retain the candidate size from step 1. Clamp again to ensure compliance with constraints.
7. **Return size.** Report the final width/height to the parent; they MUST lie within the original constraints.

### 2. Layout pass

Input: `origin` (top-left point) and `size` (outer rect from measurement).

1. **Update rects.** Set the container’s rect to `(origin.x, origin.y, size.width, size.height)` and derive the inner rect by subtracting padding.
2. **Resolve flow bases.**
   - Start from the intrinsic sizes recorded earlier.
   - Apply dimension tokens:
     `hug` / `auto` / `lock` → intrinsic size;
     `<number>` → literal;
     `fill` → basis `0`, default `grow = 1`, `shrink = 1`;
     `<number>%` → `floor(innerFlowSize * percentage)` (use `0` if size unknown);
     `<number>fr` → basis `0`, default `grow = N`.
   - Apply explicit `grow`/`shrink` overrides.
   - Clamp the basis between resolved `min`/`max` bounds.
3. **Compute free space.**
   `totalBasis = Σ basis`
   `totalGaps = gap * max(childCount - 1, 0)`
   `freeSpace = innerFlowSize - (totalBasis + totalGaps)`
4. **Grow phase (freeSpace > 0).**
   - Consider items with `grow > 0`. Sum `totalGrow = Σ grow`.
   - Each eligible item receives `extra = floor(freeSpace * (grow / totalGrow))`, capped by its `max`.
   - Distribute leftover cells (from flooring) from flow start to flow end, giving at most one additional cell per pass to items that can still grow.
5. **Shrink phase (freeSpace < 0).**
   - Let `deficit = -freeSpace`.
   - Consider items with `shrink > 0`. If none exist, record overflow and skip to step 6.
   - For each item compute available shrink room: `currentSize - minBound`.
   - Sum total shrink capacity. If capacity < deficit, shrink each item to its min bound, record overflow amount (`deficit - capacity`), and stop. Otherwise:
     - Shrink proportionally: `loss = floor(deficit * (shrink / totalShrink))`, but not below `minBound`.
     - Accumulate remainder cells (due to flooring) and distribute from flow end toward flow start to maintain visual stability.
   - Widgets with `hug`, `auto`, or `lock` only shrink if their `shrink` weight is > 0.
6. **Resolve cross-axis sizes.**
   - Start from intrinsic cross sizes.
   - Apply cross-axis tokens (if any) and clamp to `min`/`max`.
   - If container or item requests `stretch`, expand up to the inner cross size (bounded).
7. **Positioning.**
   - Compute starting cursor on the flow axis using `distribute` and the resolved item sizes.
   - For `between`, split remaining space into `childCount - 1` gaps. For `around`, split into `childCount * 2` half-gaps (before first, between, after last).
   - Iterate children in order: place each rect at `(flowCursor, crossOrigin + crossOffset)`, then advance the cursor by the item’s flow size plus gap and any distribution-specific spacing.
   - Determine cross-axis offset from container-level `align` unless a per-item override is present. `stretch` sets offset to zero.
8. **Record overflow.** If any item exceeds the inner rect because shrinking could not resolve the deficit, mark the container as overflowing. Renderer policies (clip, scroll) MAY react to this flag.
9. **Propagate layout.** Call each child’s layout routine with its assigned origin and size.

---

## Overflow handling

- Containers MUST track whether overflow occurred during the shrink phase.
- Overflow does not automatically clip content; renderers decide whether to clip, scroll, or draw beyond bounds. Regardless, layout MUST report deterministic rects.
- Scrollable widgets MAY consult overflow flags to decide when to enable scrolling.

---

## Worked examples

### Example 1: Basic `HStack`

Setup:

- Outer width fixed at 20 cells; height hugs children.
- `gap = 1`, `padding = 0`.
- `distribute = start`, `align = start`.
- Children:
  1. Label (`hug`, intrinsic width 4).
  2. Panel (`fill`, intrinsic width 5).
  3. Button (fixed width 3).

Result:

1. Bases `[4, 0, 3]`; total gaps `2`; free space `20 - 9 = 11`.
2. Grow phase: only child 2 grows; new widths `[4, 11, 3]`.
3. Distribution `start` leaves no extra spacing; cursor advances left-to-right with one-cell gaps.
4. Cross axis sizes remain intrinsic (no stretch).

### Example 2: `VStack` with flow distribution

Setup:

- Outer height = 18; width hugs children.
- `gap = 0`, `padding = [2, 0]` (top/bottom = 2, left/right = 0).
- `distribute = between`, `align = center`.
- Three children, each hugging height `3` and width `6`.

Result:

1. Inner height = `18 - (2 + 2) = 14`. Bases sum to `9`, free space `5`.
2. `between` divides free space into `childCount - 1 = 2` interior gaps → each receives `floor(5 / 2) = 2`. Remainder `1` stays near flow end.
3. Placement: first child at top padding, second 5 cells lower (3 + 2 gap), third another 5 lower, final trailing slack at bottom.
4. Cross axis centers each child horizontally.

### Example 3: Shrink weights only

Setup:

- `HStack` inner width = 12, `gap = 1`, `distribute = end`.
- Children:
  1. Sidebar: basis `7`, `shrink = 0`.
  2. Content: `fill` (default `grow = 1`, `shrink = 1`).
  3. Inspector: fixed width `4` with `shrink = 1`.

Process:

1. Bases `[7, 0, 4]`; total gaps `2`; free space `12 - 13 = -1` (deficit `1`).
2. Shrink phase considers items 2 and 3 (weights `[1, 1]`). Total shrink capacity = `(0 - 0) + (4 - minBound)` = 4 (assuming min 1).
   - Each loses `floor(1 * (1 / 2)) = 0`; remainder `1` removed from flow end → Inspector shrinks to `3`. Deficit resolved. Sidebar untouched.
3. Distribution `end` packs children against flow end (right). Remaining slack appears on flow start.

---

## Extensibility notes

- Additional container types MAY translate their behavior into flow/cross constraints before delegating to children.
- Alternate flow directions (right-to-left or bottom-to-top) MAY introduce semantic aliases (e.g., `flowStart` meaning right) but MUST map back to the canonical definitions used here.
- Future features such as baseline alignment or multi-line wrapping SHOULD build on the primitives defined in this specification (dimension tokens, grow/shrink weights, distribution modes) without altering existing behavior.

---

## Summary

Canto’s v2 layout engine transforms intent tokens and constraints into deterministic rectangles on a discrete grid. Every component is a widget, implemented either as a container or a leaf. Authors reason in terms of stacks, distribution, alignment, and high-level tokens (`hug`, `fill`, `lock`), while implementers follow the measurement and layout pipeline described above. Any compliant renderer MUST reproduce these outcomes for the same inputs, ensuring consistent behavior across environments and future iterations.
