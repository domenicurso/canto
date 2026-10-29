# Overlays

[API index](README.md) · [Factory](../../src/element/factories.ts) · [Props](../../src/element/overlay.ts) · [Behavior](../../src/runtime/overlay-input.ts)

```ts
overlay(...children: Child[]): Element
overlay(options: OverlayProps): Element
```

The child form stacks ordinary children at one origin and obeys ancestor clipping. The options form creates an absolute viewport layer that escapes flow and ancestor clipping. Your application owns border, background, padding, backdrop, and open/closed state.

## OverlayProps

| Property           | Type                                                                                   | Default and behavior                                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `content`          | `Child`                                                                                | Required                                                                                                                     |
| `modal`            | `boolean`                                                                              | `false`; traps focus and blocks background pointer input when true                                                           |
| `focus`            | `"first" \| "none"`                                                                    | Modal: autofocus or first control. Nonmodal: keep focus unless `"first"` is requested. Modal `"none"` focuses its container. |
| `anchor`           | `() => Readonly<{ x: number; y: number; width: number; height: number }> \| undefined` | None; read at placement so live geometry is followed                                                                         |
| `placement`        | `"center"`, `"bottom-start"`, `"bottom-end"`, `"top-start"`, `"top-end"`               | `"center"`                                                                                                                   |
| `offset`           | `number`                                                                               | Zero-cell separation from the anchor                                                                                         |
| `onDismiss`        | `() => void`                                                                           | None; application removes the layer in response                                                                              |
| `dismissOnEscape`  | `boolean`                                                                              | Enabled unless false; needs `onDismiss`                                                                                      |
| `dismissOnOutside` | `boolean`                                                                              | Enabled unless false; needs `onDismiss`                                                                                      |

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
