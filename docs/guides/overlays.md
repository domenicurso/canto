# Dialogs and popovers

[Documentation](../README.md)

`overlay(...children)` still stacks ordinary children. `overlay({ content, ... })` adds viewport placement and interaction behavior without supplying a border, background, backdrop, or padding:

```ts
overlay({
  modal: true,
  onDismiss: close,
  content: column(
    text("Publish?"),
    button("Publish", publish),
    button("Cancel", close),
  ),
})
  .width(40)
  .border("rounded")
  .padding(1);

overlay({
  anchor: () => trigger.current?.rect,
  placement: "bottom-start",
  focus: "first",
  onDismiss: close,
  content: actions,
})
  .width(24)
  .background("#17232c");
```

Behavior overlays escape ancestor clipping and paint above ordinary content, ordered by `zIndex` and tree order. They center by default; anchored placements support top/bottom and start/end, optional `offset`, edge flipping, and viewport clamping. Anchors are callbacks so placement follows scrolling and resizing. Keep scrollable dialog bodies separate from their action rows when height is constrained, as `examples/overlays.ts` does.

`modal: true` traps keyboard focus and blocks background pointer input. A modal focuses its autofocus control or first control; `focus: "none"` focuses the overlay container. Nonmodal overlays keep current focus unless `focus: "first"` is requested. Closing restores the previous active control. Escape and outside presses call the topmost overlay's `onDismiss`; use `dismissOnEscape: false` or `dismissOnOutside: false` to disable either. Outside dismissal consumes the press. You own open/closed state and every visual style.

These fragments assume application-owned `close`, `publish`, `actions`, and a `useRef<ElementRef | null>(null)` named `trigger`. See [all overlay options](../api/overlays.md) and the [complete example](../../examples/overlays.ts).
