# Frame inspector and performance

[Documentation](../README.md)

Every app includes an inspector, hidden initially. F3 toggles it; Escape cancels picking or closes it. Its gray, borderless UI is built from Canto components in a separate mounted tree, so its controls and scrolling use the same runtime as your application without appearing in the inspected tree. `{ debug: false }` releases F3 and Ctrl+Shift+I while retaining programmatic access through `app.debug` and `useApp().debug`.

Choose Elements to browse the mounted tree, or Pick to hover application content and click a node. Ctrl+Shift+I also toggles picking. Colored regions distinguish content, padding, borders, and space between flow children. The tooltip reports actual cell geometry; Canto has no margin property. Scroll or drag the tree's scrollbar, navigate with arrows and Home/End or Page Up/Down, and collapse or expand with Left/Right. Layout, Styles, Props, and State expose the selected node's geometry, resolved appearance, declared styles and variants, props, callbacks, hooks, and interaction state. Property values wrap within their own scroll region. Tab moves between inspector scroll regions; clicking application content returns keyboard navigation to the application.

The header keeps Stats and Elements on the left and Pick, placement, and Close on the right. Sidebar reserves real layout space and makes `useViewport()` report the remaining columns; Overlay leaves the viewport unchanged. Sidebar falls back to an overlay below 50 terminal columns and returns when space is available. Closing restores the application's width and preserves its state and focus. Use `app.debug.setPlacement("sidebar")` or `setPicking(true)` to control these modes from application code.

FPS and viewport size sit above two columns: content preparation and painting on the left, completed frame and terminal costs on the right. Below 8 FPS, each new content frame publishes immediately, including isolated hover, press, and release updates. Faster streams refresh at most four times per second, retaining the actual content frame with the most changed cells (breaking ties by CPU time) and the actual completed frame with the highest total latency. No values are averaged: `Content #N` identifies the frame for CPU and exact work counts, while `Output #M` identifies the completed frame for total, inspector, encoding, write, interval, and byte measurements. Output completion cannot be known while painting the current panel, so its frame ID is separate. FPS counts completed adapter presentations in the last second. The inspector redraws only with app frames, so idle apps do not gain a diagnostic animation loop.

`app.stats` exposes an immutable measurement of the most recently completed frame. `contentTime` includes view reconciliation, style/layout preparation, painting, native raster preparation, and the content cell diff. `debugTime` includes inspector composition, its rasters, and the final cell diff. `presentTime` includes the complete adapter call. The process adapter additionally reports native encoding time, stream write/backpressure time, and output bytes. `renderTime` spans reconciliation through completed output; `intervalTime` measures completion-to-completion spacing, including idle and timer delays. Adapter completion cannot measure the terminal emulator's GPU display latency. Injected adapters may expose `presentation` measurements; unavailable metrics display a dash.

Content cell changes exclude the inspector, while `cellsWritten` includes its actual terminal cell updates. Native uploads are measured separately in output bytes. Layout nodes and painted cells describe work performed, so cached layout can report zero nodes even with a full-screen canvas animation. Pointer motion within an unchanged target does not schedule a frame; hover transitions, dragging, and reactive mouse handlers still update normally.

See [stats field definitions](../api/diagnostics.md), [terminal limitations](../reference/compatibility.md), and [testing](testing.md).

## Editing elements

The Elements tree highlights names, strings, numbers, and literals. Click a breadcrumb to select an ancestor. The Layout tab includes a visual border, padding, and content diagram in terminal cells; the gray sidebar itself stays borderless. Scrollbar tracks blend into the panel, and thumbs appear while hovering their scroll region.

Click a supported scalar style value in Styles or text in Props to edit its JSON representation. Enter applies the value; Escape cancels. Invalid input stays in the editor with an error. Changes are temporary overrides on the mounted node and survive application renders; Reset removes all overrides for that node. Removing the node discards them. Callback props, objects, and hook state remain read-only; edits never write source files.

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
