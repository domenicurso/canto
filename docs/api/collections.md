# Scrolling and virtual lists

[API index](README.md) · [Factory](../../src/element/factories.ts) · [Props](../../src/element/props.ts) · [List](../../src/element/list.ts)

## scroll and ScrollProps

```ts
scroll(content: Child, props?: ScrollProps): Element
interface ScrollPosition { x: number; y: number }
```

| Property        | Type                                                    | Default                 | Notes                    |
| --------------- | ------------------------------------------------------- | ----------------------- | ------------------------ |
| `axis`          | `"vertical" \| "horizontal" \| "both"`                  | `"vertical"`            |                          |
| `offset`        | `number \| ScrollPosition`                              | —                       | Controlled               |
| `defaultOffset` | `number \| ScrollPosition`                              | `0` or `{ x: 0, y: 0 }` | Uncontrolled             |
| `onScroll`      | `(offset) => void`                                      | —                       | Axis-dependent signature |
| `scrollbar`     | `"auto" \| "hidden" \| "visible"`                       | `"auto"`                |                          |
| `gutter`        | `"auto" \| "stable"`                                    | `"auto"`                |                          |
| `physics`       | `"instant" \| { friction?: number; momentum?: number }` | `"instant"`             |                          |

Single-axis offsets are numbers; both-axis offsets use `ScrollPosition`. `onScroll` receives the corresponding type. Controlled `offset` requires `onScroll` and excludes `defaultOffset`. Stable gutters reserve bar space without overflow; hidden scrollbars reserve none. An object-valued `physics` enables inertia.

Friction defaults to 8 per second and must be finite and positive. Momentum defaults to 2 and must be finite and nonnegative; zero disables added travel. Invalid physics throws during factory construction. Offsets clamp to content bounds. Give scroll regions bounded dimensions so overflow has a viewport.

```ts
import { column, scroll, text, useState } from "canto";

export function Log() {
  const [offset, setOffset] = useState(0);
  return scroll(
    column(Array.from({ length: 100 }, (_, i) => text(`Line ${i}`))),
    { offset, onScroll: setOffset, gutter: "stable" },
  )
    .height(12)
    .width("fill");
}
```

Vertical scrolling measures unbounded height; horizontal scrolling unbounded width; both-axis scrolling unbounds both. [The layout contract](../reference/layout.md#scrolling) describes gutter settlement. Arrow keys, Page Up/Down, wheels, dragging, and `ElementRef.scrollTo()` change offsets. Focus traversal reveals focused descendants. Controlled callers must feed accepted positions back through props.

## list and ListOptions

```ts
list<T>(items: readonly T[], options: ListOptions<T>): Element
interface ListOptions<T> {
  height: number;
  itemHeight: number;
  key: (item: T) => string | number;
  render: (item: T, index: number) => Child;
}
```

`height` is viewport height and `itemHeight` is fixed row height in cells. Both must be positive integers or construction throws. `key` supplies stable sibling identity and `render` describes a mounted row. Width fills available space. The list owns vertical scrolling and mounts visible rows plus one overscan row on each side.

Off-screen rows unmount their hooks and effects. Keep durable item state in a parent or dataset so scrolling doesn't reset it. Variable-height rows aren't supported. Use `.map()` for small collections or when all rows must remain mounted.

See [the scrolling guide](../guides/scrolling.md), [large-list example](../../examples/virtual-list.ts), and [scrollbar styles](styles.md).
