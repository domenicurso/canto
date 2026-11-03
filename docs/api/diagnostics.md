# Diagnostics and frame statistics

[API index](README.md) · [Controls](../../src/runtime/inspector/chrome.ts) · [Frame fields](../../src/runtime/frame-stats.ts) · [Presentation fields](../../src/terminal/output/presentation.ts)

## DebugControl

```ts
interface DebugControl {
  readonly visible: boolean;
  readonly picking: boolean;
  readonly placement: "overlay" | "sidebar";
  setVisible(visible: boolean): void;
  setPicking(picking: boolean): void;
  setPlacement(placement: "overlay" | "sidebar"): void;
  toggle(): void;
}
```

Available as `app.debug` and `useApp().debug`. F3 toggles the inspector; Ctrl+Shift+I toggles element picking. Escape cancels picking first, then closes the panel. `{ debug: false }` releases both shortcuts while retaining programmatic control. The Stats and Elements tabs, tree, property tabs, buttons, scrollbars, and tooltips are Canto components in a separate mounted tree with independent focus and input routing.

Overlay placement keeps the application viewport unchanged. Sidebar placement reserves terminal columns and updates `useViewport()` so the application reflows; closing restores its width. Below 50 columns, sidebar placement temporarily falls back to an overlay. Inline sidebar sessions use the available terminal height while visible. Pick and placement controls sit at the right of the header beside Close.

Picking highlights content in blue, padding in green, borders in yellow, and spacing between flow children in orange. Hover shows box dimensions and insets; click pins the node. The tree supports wheel scrolling, scrollbar dragging, arrows, Home/End, Page Up/Down, and expanding or collapsing branches with Left/Right. Tab switches between its scroll regions. Layout, Styles, Props, and State show geometry, resolved and declared styles, variants, handlers, hooks, and interaction/editor/scroll state. Values wrap and scroll independently; inspecting state does not execute accessors. Selection and inspector navigation don't change application focus or activate its controls.

## ContentFrameStats

All durations are milliseconds. Work counts describe operations performed, so unchanged layout can report zero nodes even when pixels animate.

| Field                 | Type     | Unit     | Notes                          |
| --------------------- | -------- | -------- | ------------------------------ |
| `frame`               | `number` | —        | Frame number                   |
| `fps`                 | `number` | frames/s | Completed presentations        |
| `updateTime`          | `number` | ms       | Reconciliation                 |
| `layoutTime`          | `number` | ms       | Layout call                    |
| `prepareTime`         | `number` | ms       | Style and geometry preparation |
| `paintTime`           | `number` | ms       | Paint and raster preparation   |
| `diffTime`            | `number` | ms       | Content diff                   |
| `contentTime`         | `number` | ms       | Total content work             |
| `layoutNodes`         | `number` | nodes    | Layout work                    |
| `paintedCells`        | `number` | cells    | Paint work                     |
| `contentCellsWritten` | `number` | cells    | Content changes                |

`fps` counts presentations over the last second. `layoutTime` excludes style resolution and scroll placement, and is zero when layout is reused. `prepareTime` includes style resolution, invalidation, layout, scroll repositioning, and overlay placement, excluding reconciliation. `contentTime` includes reconciliation through the content diff, excluding inspector and I/O; `contentCellsWritten` also excludes inspector changes.

## FrameStats

`FrameStats` extends `ContentFrameStats`. `app.stats` exposes a read-only snapshot of the most recently completed frame.

| Field          | Type     | Unit  | Notes                      |
| -------------- | -------- | ----- | -------------------------- |
| `cellsWritten` | `number` | cells | Includes inspector         |
| `renderTime`   | `number` | ms    | Start to output completion |
| `debugTime`    | `number` | ms    | Inspector and final diff   |
| `presentTime`  | `number` | ms    | Adapter call               |
| `intervalTime` | `number` | ms    | Completion interval        |
| `encodeTime?`  | `number` | ms    | Adapter encoding           |
| `writeTime?`   | `number` | ms    | Writes and backpressure    |
| `outputBytes?` | `number` | bytes | Includes graphics          |

## PresentationStats

Adapters optionally expose `presentation: Readonly<PresentationStats>` after a completed presentation:

```ts
interface PresentationStats {
  encodeTime: number;
  writeTime: number;
  bytes: number;
}
```

These map to optional frame `encodeTime`, `writeTime`, and `outputBytes`. Missing metrics remain unavailable rather than zero. Output completion doesn't measure terminal-emulator GPU display latency.

The panel samples actual frames rather than averages, and may show separate content and output frame IDs because the current presentation hasn't completed while the inspector is being painted. See [the debugging guide](../guides/debugging.md) for sampling behavior and [benchmarks](../contributing.md#terminal-verification) for repeatable performance checks.
