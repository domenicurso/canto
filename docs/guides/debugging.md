# Frame inspector and performance

[Documentation](../README.md)

Every app includes a compact translucent inspector, hidden initially. F3 toggles it; Escape or its close control hides it. Use `app.debug.toggle()`, `app.debug.setVisible(true)`, or `useApp().debug` for custom controls. `{ debug: false }` releases F3 to the app while retaining programmatic access. The inspector sits flush with the bottom-right viewport edges without changing application layout, focus, or modal state. Hover a metric label for a brief, borderless tooltip with one cell of horizontal padding.

FPS and viewport size sit above two columns: content preparation and painting on the left, completed frame and terminal costs on the right. Below 8 FPS, each new content frame publishes immediately, including isolated hover, press, and release updates. Faster streams refresh at most four times per second, retaining the actual content frame with the most changed cells (breaking ties by CPU time) and the actual completed frame with the highest total latency. No values are averaged: `Content #N` identifies the frame for CPU and exact work counts, while `Output #M` identifies the completed frame for total, inspector, encoding, write, interval, and byte measurements. Output completion cannot be known while painting the current panel, so its frame ID is separate. FPS counts completed adapter presentations in the last second. The inspector redraws only with app frames, so idle apps do not gain a diagnostic animation loop.

`app.stats` exposes an immutable measurement of the most recently completed frame. `contentTime` includes view reconciliation, style/layout preparation, painting, native raster preparation, and the content cell diff. `debugTime` includes inspector composition, its rasters, and the final cell diff. `presentTime` includes the complete adapter call. The process adapter additionally reports native encoding time, stream write/backpressure time, and output bytes. `renderTime` spans reconciliation through completed output; `intervalTime` measures completion-to-completion spacing, including idle and timer delays. Adapter completion cannot measure the terminal emulator's GPU display latency. Injected adapters may expose `presentation` measurements; unavailable metrics display a dash.

Content cell changes exclude the inspector, while `cellsWritten` includes its actual terminal cell updates. Native uploads are measured separately in output bytes. Layout nodes and painted cells describe work performed, so cached layout can report zero nodes even with a full-screen canvas animation. Pointer motion within an unchanged target does not schedule a frame; hover transitions, dragging, and reactive mouse handlers still update normally.

See [stats field definitions](../api/diagnostics.md), [terminal limitations](../reference/compatibility.md), and [testing](testing.md).

## Hot reload

Run `bun run dev` for Studio or `bun run dev:inline` for the counter. For your own entry point, give the application a stable identity and let the module finish evaluating so Bun can begin watching:

```ts
const app = createApp(Main, { hot: import.meta.url });
void app.run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Start it with `bun --hot --no-clear-screen entry.ts`. Canto keeps one terminal session and replaces the root render function, retaining compatible root hooks. Mark nested components with unique `component(render, { hot: "component-name" })` identities to retain their hooks too. Effects clean up and rerun, memo closures refresh, and incompatible hook layouts remount. State type changes and session option changes require a restart. Other development watchers can call `app.update(render)`; Canto's current runtime still requires Bun.
