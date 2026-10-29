# Architecture

[Documentation](README.md)

Runtime coordinates immutable element descriptions, mounted component state, cell layout, retained painting, and awaited terminal output. The subsystem boundaries below own those lifecycles; applications extend them through the public entry point.

## Ownership and dependencies

| Boundary   | Owns                                                                     | Main entry points                                                                |
| ---------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `element`  | Descriptions, component identities, props, canvas contracts              | [node](../src/element/node.ts), [factories](../src/element/factories.ts)         |
| `style`    | Immutable style composition and value contracts                          | [builder](../src/style/builder.ts), [types](../src/style/types.ts)               |
| `runtime`  | Mounted tree, hooks, event routing, frame scheduling, session lifetime   | [app](../src/runtime/app.ts), [frame](../src/runtime/frame.ts)                   |
| `layout`   | Measurement, allocation, clipping geometry, overlay placement            | [arrangement](../src/layout/arrange.ts)                                          |
| `render`   | Retained cells, damage, opacity, raster composition, ANSI cell diff      | [retained paint](../src/render/retained.ts), [diff](../src/render/diff.ts)       |
| `terminal` | Input bytes, process ownership, capabilities, transport, native graphics | [process](../src/terminal/process.ts), [transport](../src/terminal/transport.ts) |
| `text`     | Graphemes, column widths, wrapping, navigation                           | [columns](../src/text/columns.ts), [wrap](../src/text/wrap.ts)                   |

Descriptions depend on style and element contracts. Runtime orchestrates layout, rendering, and terminal I/O over the mounted tree. Several subsystems consume runtime tree types; those are internal shared data contracts, not a second public API. Terminal transport consumes rendered screens but doesn't mount components or invoke hooks. The public boundary is `index.ts`; source-module exports aren't automatically package exports.

## Frame and failure lifecycle

1. A state setter marks its component dirty and queues a microtask; multiple updates can share a frame.
2. Reconciliation preserves identity by component type and sibling key, then input routing refreshes focus and overlay scopes.
3. Style resolution determines geometry invalidation. Layout reuses matching constraints; offset-only scrolling repositions measured content.
4. Retained paint recomposes damaged rows through clipping and stacking, then prepares rasters and diffs cells. The inspector composites above content.
5. The adapter presents with backpressure. Refs attach and effects commit after successful output; an effect can schedule another frame.
6. Shutdown waits for output, disposes input ownership, clears focus, unmounts effects and refs, and stops the terminal. Render, event, effect, or write failures reject `run()` after cleanup; the first recorded failure is retained.

## Extension points

Build reusable controls with `component()` and ordinary elements, share appearance with `style()`, render custom cells or RGBA through `canvas()`, and integrate other transports through `Terminal`. Clipboard injection owns host clipboard integration. New behavior belongs at the boundary that owns its lifetime: overlay placement in layout, dismissal in runtime, pixels in render, and protocol encoding and native image IDs in terminal.

See [the layout contract](reference/layout.md) for cache invalidation and [compatibility](reference/compatibility.md) for limits that applications need to account for.
