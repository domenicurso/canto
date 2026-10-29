# Scrolling and large collections

[Documentation](../README.md)

```ts
scroll(content, { defaultOffset: 0 }).height(12);
scroll(content, { axis: "both", offset: { x, y }, onScroll: setPosition });
scroll(content, { scrollbar: "hidden", physics: { friction: 8, momentum: 2 } });

list(projects, {
  height: 20,
  itemHeight: 1,
  key: (project) => project.id,
  render: (project) => text(project.name),
});
```

Scroll regions support controlled or default offsets, vertical/horizontal/both axes, automatic/hidden/visible scrollbars, and stable gutters. Arrow keys, Page Up/Down, mouse wheels, and refs move the viewport. Focus navigation reveals newly focused descendants. Hidden scrollbars reserve no gutter, including with `gutter: "stable"`; visible thumbs use eighth-cell Unicode blocks. Drag either thumb to set its offset, including outside the track; clicking the track centers the thumb at that position. Keyboard or pointer presses cancel ongoing artificial momentum.

Native wheel reports move in terminal-provided cell units; terminals that normalize trackpad movement already account for cell aspect ratio. Adapters can supply `deltaMode: "pixel"` with `deltaX` and `deltaY`, which Canto converts using `terminal.cellSize`. The process adapter queries cell dimensions and falls back to 8 × 16 pixels when unsupported. Arrow keys move one cell. Wheel bursts coalesce before rendering and preserve both axes of diagonal gestures.

Physics defaults to `"instant"`, so Canto adds no motion after input stops. An object enables inertia: `friction` is the positive exponential decay rate per second (default 8), and `momentum` scales the added travel (default 2; zero disables it). Existing trackpad momentum can combine with this effect, so leave physics off when the terminal already supplies the desired motion. The scrollbars demo toggles inertia with I and bars with B.

`list()` mounts visible rows plus one row of overscan on each side. Row heights must be fixed, positive integers. Off-screen rows unmount; keep persistent item state in the dataset or a parent component. Ordinary `.map()` intentionally evaluates every item and is appropriate for small collections.

`useViewport()` returns `{ width, height }` in cells and rerenders its component on resize. Use it to stack panes or reduce padding under tight constraints; `examples/layout.ts` demonstrates both. Inline output is clipped to the available terminal height and repainted when the viewport changes.

See [scroll and list options](../api/collections.md) and the [virtual list example](../../examples/virtual-list.ts). Names such as `projects`, `content`, and `setPosition` in these fragments represent application data and state.
