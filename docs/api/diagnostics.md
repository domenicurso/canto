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

| Field                 | Meaning                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| `frame`               | Content frame number                                                                                         |
| `fps`                 | Completed adapter presentations in the last second                                                           |
| `updateTime`          | View reconciliation                                                                                          |
| `layoutTime`          | Layout call only when geometry or viewport changes; excludes style resolution and scroll placement           |
| `prepareTime`         | Style resolution, invalidation, layout, scroll repositioning, and overlay placement; excludes reconciliation |
| `paintTime`           | Content painting and raster preparation                                                                      |
| `diffTime`            | Content cell comparison                                                                                      |
| `contentTime`         | Content preparation, painting, and diff; excludes inspector and I/O                                          |
| `layoutNodes`         | Layout work count                                                                                            |
| `paintedCells`        | Painted cell work count                                                                                      |
| `contentCellsWritten` | Changed content cells, excluding inspector                                                                   |

## FrameStats

`FrameStats` extends `ContentFrameStats`. `app.stats` exposes a read-only snapshot of the most recently completed frame.

| Additional field | Meaning                                                        |
| ---------------- | -------------------------------------------------------------- |
| `cellsWritten`   | Final changed cells including inspector                        |
| `renderTime`     | Frame start through completed output                           |
| `debugTime`      | Inspector composition, raster preparation, and final cell diff |
| `presentTime`    | Entire adapter `present()` call                                |
| `intervalTime`   | Completion-to-completion interval, including idle time         |
| `encodeTime?`    | Adapter-provided native/output encoding time                   |
| `writeTime?`     | Adapter-provided stream write and backpressure time            |
| `outputBytes?`   | Adapter-provided output byte count, including native graphics  |

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
