# Diagnostics and frame statistics

[API index](README.md) · [Controls](../../src/runtime/debug-panel.ts) · [Frame fields](../../src/runtime/frame-stats.ts) · [Presentation fields](../../src/terminal/presentation.ts)

## DebugControl

```ts
interface DebugControl {
  readonly visible: boolean;
  setVisible(visible: boolean): void;
  toggle(): void;
}
```

Available as `app.debug` and `useApp().debug`. The inspector starts hidden, toggles with F3, and closes with Escape or its close control. `{ debug: false }` releases F3 while keeping programmatic control. It composites after application content without changing layout or focus, and captures pointer input within its bounds.

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
