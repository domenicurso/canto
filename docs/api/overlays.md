# Overlays

[API index](README.md) · [Factory](../../src/element/factories.ts) · [Props](../../src/element/overlay.ts) · [Behavior](../../src/runtime/overlay-input.ts)

```ts
overlay(...children: Child[]): Element
overlay(options: OverlayProps): Element
```

The child form stacks ordinary children at one origin and obeys ancestor clipping. The options form creates an absolute viewport layer that escapes flow and ancestor clipping. Your application owns border, background, padding, backdrop, and open/closed state.

## OverlayProps

| Property           | Type                                                                     | Default           | Notes                   |
| ------------------ | ------------------------------------------------------------------------ | ----------------- | ----------------------- |
| `content`          | `Child`                                                                  | Required          |                         |
| `modal`            | `boolean`                                                                | `false`           | Traps focus             |
| `focus`            | `"first" \| "none"`                                                      | Context-dependent | See below               |
| `anchor`           | `() => Readonly<ElementRef["rect"]> \| undefined`                        | —                 | Live geometry           |
| `placement`        | `"center" \| "bottom-start" \| "bottom-end" \| "top-start" \| "top-end"` | `"center"`        |                         |
| `offset`           | `number`                                                                 | `0`               | Cells                   |
| `onDismiss`        | `() => void`                                                             | —                 | Application-owned state |
| `dismissOnEscape`  | `boolean`                                                                | `true`            | Requires `onDismiss`    |
| `dismissOnOutside` | `boolean`                                                                | `true`            | Requires `onDismiss`    |

Placement accepts `"center"`, `"bottom-start"`, `"bottom-end"`, `"top-start"`, or `"top-end"`. Anchors are read during placement to follow geometry changes.

Modals block background pointer input and focus an autofocus control or the first control; `focus: "none"` focuses the overlay container. Nonmodal overlays keep existing focus unless `focus: "first"` is requested. `onDismiss` must update application state to remove the layer.

Placement flips when the preferred edge lacks room, then clamps to the viewport. Layers paint above ordinary content in `zIndex` and tree order. The topmost layer handles dismissal; outside dismissal consumes the press. Closing restores the previous active focus target when appropriate.

```ts
import { button, column, overlay, text, useState } from "canto";

export function Confirm() {
  const [open, setOpen] = useState(false);
  return column(
    button("Open confirmation", () => setOpen(true)),
    open &&
      overlay({
        modal: true,
        onDismiss: () => setOpen(false),
        content: column(
          text("Continue?"),
          button("Close", () => setOpen(false)),
        ),
      })
        .width(30)
        .padding(1)
        .border("rounded")
        .background("#17232c"),
  );
}
```

For menus, capture a trigger [ElementRef](events.md) and use `anchor: () => trigger.current?.rect`. See [the guide](../guides/overlays.md) and [complete example](../../examples/overlays.ts) for scrolling dialog bodies with separate action rows.
