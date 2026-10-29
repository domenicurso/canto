# Events and mounted refs

[API index](README.md) · [Element events](../../src/element/events.ts) · [Terminal events](../../src/terminal/events.ts)

## KeyEvent and keyEvent

| Field or method                          | Contract                                                              |
| ---------------------------------------- | --------------------------------------------------------------------- |
| `key: string`                            | Decoded key name, such as `"enter"`, `"tab"`, `"escape"`, or `"left"` |
| `text?: string`                          | Text payload for insertion, including pasted text                     |
| `ctrl`, `alt`, `shift`                   | Required booleans                                                     |
| `meta?: boolean`                         | Optional modifier; forwarding depends on terminal support             |
| `defaultPrevented`, `propagationStopped` | Read-only event state                                                 |
| `preventDefault(): void`                 | Suppresses default editing or control action                          |
| `stopPropagation(): void`                | Stops ancestor bubbling                                               |

`.onKey()` bubbles through ancestors. Preventing default and stopping propagation are independent. Default Ctrl+C shutdown and inspector shortcuts have session-level handling; see [AppOptions](app.md) when reserving shortcuts.

```ts
keyEvent(key: string, options?: Partial<
  Pick<KeyEvent, "text" | "ctrl" | "alt" | "shift" | "meta">
>): KeyEvent
```

The helper creates mutable prevention state behind read-only getters. Modifiers default to false. Use it in tests instead of fabricating methods and state fields manually.

## PointerEvent

| Field                     | Type and units                                    |
| ------------------------- | ------------------------------------------------- |
| `x`, `y`                  | Viewport-relative terminal cell coordinates       |
| `action`                  | `"press"`, `"release"`, `"move"`, `"scroll"`      |
| `button`                  | Numeric button code; 0 is the primary button      |
| `deltaY`                  | Required wheel delta; use 0 for non-scroll events |
| `deltaX?`                 | Optional horizontal wheel delta                   |
| `deltaMode?`              | `"cell"` or `"pixel"`; absent uses cell units     |
| `shift?`, `alt?`, `ctrl?` | Optional modifiers                                |
| `clicks?`                 | `1`, `2`, or `3`; adapters may supply click count |

Hit testing follows painted clipping and stacking. Pixel deltas convert through terminal cell metrics. Native selection mode disables application pointer tracking. Pointer events don't expose keyboard prevention or bubbling methods. See [input](../guides/input.md) for selection, multiclick timing, and clipboard behavior.

## ElementRef

```ts
interface ElementRef {
  focus(): void;
  scrollTo(offset: number | { x: number; y: number }): void;
  readonly rect: { x: number; y: number; width: number; height: number };
}
```

`.ref(callback)` receives a handle after output commits and `null` on detach. Its rectangle tracks live mounted geometry in viewport cells, including translation. `focus()` targets the mounted element subject to eligibility and active modal scope. `scrollTo()` uses scalar offsets for a single axis and coordinates for both axes; controlled regions still rely on the owner publishing accepted positions.

```ts
import { button, column, input, useRef, type ElementRef } from "canto";

export function Search() {
  const target = useRef<ElementRef | null>(null);
  return column(
    input().ref((element) => {
      target.current = element;
    }),
    button("Focus search", () => target.current?.focus()),
  );
}
```

## TerminalEvent

```ts
type TerminalEvent =
  | { type: "key"; event: KeyEvent }
  | { type: "mouse"; event: PointerEvent }
  | { type: "resize" };
```

Adapters emit decoded events through the callback passed to `Terminal.start()`. Resize carries no dimensions: update the adapter's width, height, and metrics before emitting. See [MemoryTerminal](terminal.md) for dispatch and resize helpers.
