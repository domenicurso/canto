# Canto v2

A terminal UI framework for Bun and TypeScript. Compose elements with ordinary functions, keep local state with hooks, and share immutable fluent styles.

This is a breaking, from-scratch v2 alpha. The v1 renderer, signal runtime, widgets, and examples have been replaced.

## Run it

```sh
bun install
bun run demo:studio   # Release-planning POC
bun run demo          # Full-screen project dashboard
bun run demo:inline   # Inline counter
bun run check        # Formatting, type checking, lint, and tests
bun run bench        # Headless 10,000-item virtual list benchmark
```

## More examples

| Command                     | What it demonstrates                                                          |
| --------------------------- | ----------------------------------------------------------------------------- |
| `bun run demo:studio`       | Responsive release workspace with search, editable briefs, and issue creation |
| `bun run demo:interactions` | Text/editor selection, clipboard actions, and draggable scrollbars            |
| `bun run demo:form`         | Controlled inputs, multiline notes, validation, and disabled actions          |
| `bun run demo:layout`       | Fixed and weighted panes, wrapping, scrolling, and an absolute badge          |
| `bun run demo:tasks`        | Adding/removing keyed components and preserving local state during reordering |
| `bun run demo:logs`         | Effect cleanup, a bounded event history, pause/resume, and follow mode        |
| `bun run demo:virtual-list` | Filtering 10,000 projects, virtualized rows, and selection                    |
| `bun run demo:pixels`       | RGBA art, native graphics selection, and modal inspection                     |
| `bun run demo:overlays`     | Anchored action menus, modal editing, dismissal, and focus restoration        |
| `bun run demo:canvas`       | Animated custom drawing, resize-aware geometry, and pause/reset controls      |
| `bun run demo:styles`       | Immutable shared styles, mixed text spans, and interaction variants           |

Studio is a complete session-based workflow: filter or search issues, open a brief, edit its title and notes, change priority, and complete or reopen it. Ctrl+F focuses search, Ctrl+N creates an issue, Escape returns to the queue on narrow screens, and F2 toggles native terminal selection. Tab moves between controls; arrow keys navigate the focused queue. Edits are temporary and reset when you quit.

Examples use local or simulated data; the form does not write contacts to disk. Their exported views can also be mounted with `MemoryTerminal` for testing.

## Original examples, rebuilt for v2

[`examples/v1/`](examples/v1/) recreates all 12 original demos with the v2 API. The directory name describes their origin; these run on the new renderer.

Run any file directly, for example:

```sh
bun examples/v1/hello.ts
bun examples/v1/choice.ts
bun examples/v1/git.ts
bun examples/v1/image.ts /path/to/image.png
```

| File                   | What it recreates                                                             |
| ---------------------- | ----------------------------------------------------------------------------- |
| `hello.ts`             | Animated live data feed                                                       |
| `conditional.ts`       | Keyboard toggles, conditional sections, and counter thresholds                |
| `prompt.ts`            | Name prompt with a default answer and length validation                       |
| `choice.ts`            | Scrolling color picker with wrapping arrow navigation                         |
| `input.ts`             | Three editable fields with live value previews                                |
| `absolute-position.ts` | Static content, pinned labels, and an animated badge                          |
| `scrollbars.ts`        | A 40 × 20 colored grid with both scrollbars                                   |
| `scroll-test.ts`       | Long lines, keyboard scrolling, and console jump commands                     |
| `console.ts`           | Animated feed and an interactive command console                              |
| `debug.ts`             | Animated counter and previous-frame rendering statistics                      |
| `git.ts`               | Read-only Git status, refresh, and selection in the current working directory |
| `image.ts`             | PNG decoding and native graphics with aspect-preserving quadrant fallback     |

Console and debug panels are composed explicitly from v2 elements. Use F3 for statistics, F12 or Ctrl+T for the console, and Escape to close it. Prompt and choice keep their accepted answer visible until Ctrl+C. The image example uses the example-only `pngjs` development dependency, composites transparency over the canvas background, and displays a built-in sample when no path is supplied; the original machine-specific image path is gone.

The [side-by-side v1/v2 comparison](examples/v1/comparison.html) shows complete implementations of the same counter, including state, styling, controls, and lifecycle. The v1 listing targets the archived API; both listings are illustrative code, while `examples/counter.ts` is runnable v2 code.

## An application

```ts
import {
  button,
  column,
  createApp,
  row,
  style,
  text,
  useApp,
  useState,
} from "canto";

const panel = style().padding([1, 2]).border("rounded").borderColor("cyan");

function Counter() {
  const [count, setCount] = useState(0);
  const app = useApp();

  return column(
    text("Counter").bold(),
    text(`Count: ${count} · Doubled: ${count * 2}`),
    row(
      button("−", () => setCount((n) => n - 1)),
      button("+", () => setCount((n) => n + 1)),
      button("Quit", () => app.stop()),
    ).gap(2),
  )
    .use(panel)
    .gap(1);
}

await createApp(Counter, { mode: "inline" }).run();
```

`createApp()` is inert. `run()` acquires the terminal, mounts the root, and resolves after shutdown and cleanup. App handles are single-use. Ctrl+C, SIGINT, SIGTERM, an optional `AbortSignal`, or `app.stop()` request shutdown. Errors reject `run()` after resources are released; Canto never calls `process.exit()`.

Full-screen sessions use the alternate screen. Inline sessions reserve a region in normal output and leave their final frame in scrollback. Redirected output receives one plain-text frame and exits. Only one process terminal session can run at a time; injected adapters have independent ownership.

## Components and state

The root and `component()` callbacks are render functions. They may run repeatedly and must stay free of side effects. Hooks must always run in the same order, outside conditionals and loops.

```ts
const Project = component(({ name }: { name: string }) => {
  const [stars, setStars] = useState(0);
  return button(`${name}: ${stars}`, () => setStars((n) => n + 1));
});

column(
  projects.map((project) => Project({ name: project.name }).key(project.id)),
);
```

`component()` creates a mounted state boundary; a plain helper function only composes descriptions. Define component factories outside render bodies. Stable types and sibling keys preserve state and focus during reordering. Removing a component disposes its state, refs, and effects.

`useState` supports direct values, lazy initialization, and functional updates. Writes coalesce into scheduled frames. Updates to a child component do not execute its unchanged ancestors. `useMemo`, `useRef`, and `useEffect` provide memoization, stable references, and external resource ownership. Effects run after output commits and clean up before replacement or unmount; dependency arrays use `Object.is` comparisons.

## Styles

Elements and `style()` expose the same fluent methods. Builders are immutable, `.use(a, b)` merges left to right, and later base declarations win. `.style({ ... })` provides the object equivalent.

```ts
const action = style()
  .padding([0, 2])
  .border("rounded")
  .focused(style().borderColor("cyan").bold())
  .pressed(style().background("blue"))
  .disabled(style().color("gray").faint());

button("Deploy", { onPress: deploy, disabled: deploying }).use(action);
text("Hello ", text("world").bold().color("cyan"));
```

Join neighboring panels with `.joinBorders()` on a row or column:

```ts
row(
  box(text("Queue")).border("rounded").fill(),
  box(text("Details")).border("rounded").fill(),
).joinBorders();
```

With zero gap, facing borders share one cell and connect with junctions. Explicit dimensions still include each panel's border; fill allocation accounts for the shared cell. Positive gaps and disabled facing edges keep panels separate. Rounded outer corners remain rounded. Single, double, and heavy borders are supported; the visible panel owns the shared edge's color and stroke. Studio uses joined panels on wide screens.

Active interaction styles override base declarations in this order: hovered, focused, pressed, disabled. Later styles merge each variant independently. Editors additionally support `.selected(style())`. Text attributes inherit; layout, backgrounds, and borders do not. Transparent children preserve the background already painted beneath them. Colors support named ANSI colors, RGB tuples, and three- or six-digit hex strings.

Read [the layout contract](LAYOUT_SPEC.md) for sizing, allocation, wrapping, clipping, and positioning rules.

## Inputs, focus, and events

```ts
input({ value: query, onChange: setQuery, placeholder: "Search…" }).autoFocus();
input({ defaultValue: "untitled", onSubmit: save });
textarea({ value: notes, onChange: setNotes }).width("fill").height(8);
```

Controlled values require `onChange`; uncontrolled values accept `defaultValue`. Both support `disabled`, `readOnly`, and placeholder text. Inputs submit on Enter; textareas insert newlines. Editing preserves graphemes and supports deletion and bracketed paste. Ctrl/Alt+Left/Right (or Alt+B/F) move by Unicode words; Home/End move to line boundaries, and Ctrl+Home/End move to document boundaries. Meta+Left/Right move to line boundaries and Meta+Up/Down to document boundaries when the terminal forwards those modifiers. Shift extends the selection for these movements; plain Left/Right collapse an existing selection to its edge. Ctrl+A selects all. Textarea Up/Down moves between logical lines; Ctrl/Alt+Up/Down moves between blank-line-separated paragraphs.

Buttons, editors, and scrolling regions participate in Tab navigation. `.focusable()`, `.tabIndex()`, `.autoFocus()`, `.onFocus()`, and `.onBlur()` customize it. Negative tab indexes permit programmatic focus while excluding Tab traversal. `.ref()` receives a mounted handle with `focus()`, `scrollTo()`, and a live `rect`; it receives `null` when detached.

`.onKey()` bubbles structured events through ancestors. `preventDefault()` suppresses default editing or activation; `stopPropagation()` stops bubbling. Buttons activate on Enter, Space, or pointer release inside the pressed button. `.onMouse()` exposes pointer events, and `.hovered()` styles their ancestors. Inline mouse coordinates require a terminal cursor-position reply; keyboard operation remains available if the terminal does not reply.

Plain `text()` is non-selectable by default because it is also used for labels and chrome. Enable content with `text("Copy this").selectable()` or put `.selectable()` on a content container; descendants inherit that policy, and the nearest `.selectable(false)` or `.selectable(true)` overrides it. Button labels remain controls, and editors retain built-in selection regardless of the surrounding policy. Native terminal selection bypasses these application rules.

Drag across selectable text elements to select their content, or drag within an editor to select its underlying value, including whole graphemes and original newlines. Text selection follows source characters across wrapped lines, copies their original spaces instead of visual line breaks, and excludes padding, empty layout rows, and button labels. Separate text elements are joined by a space on the same row or a newline on different rows. Both text and editor selection support `.selected(style())`. Plain selection clears on wheel input, other keyboard actions, source replacement, or resize. Double-click selects a Unicode word; triple-click selects a visual text row or an editor logical line, including its newline. Dragging from either expands by whole words or lines. Repeated clicks must arrive within 400ms at the same location (with one column of tolerance); adapters may also supply `PointerEvent.clicks`. Selection does not automatically scroll beyond the viewport.

Use `createApp(View, { selection: "native" })` to let the terminal handle mouse selection and copying. Switch during a session with `await app.selection.setMode("native")` or `await app.selection.setMode("text")`; `app.selection.mode` reports the current mode. The default is `"text"`. Native mode disables application mouse tracking, including pointer buttons, hover, wheels, and scrollbar dragging; keyboard controls continue to work. Injected terminal adapters support native mode through optional `setMouseTracking(enabled)`. The interactions playground toggles modes with F2, which also switches back when native mode owns the mouse.

```ts
text("Select this text").selected(style().background("blue").color("white"));
```

Alt+W or Ctrl+Insert copies the selection. Ctrl+X cuts an editable selection. Paste normally uses the terminal's native shortcut and bracketed paste; Ctrl+V or Shift+Insert additionally works when a clipboard adapter provides reads. Ctrl+C still exits. An editor's `onKey` can prevent the default clipboard action.

`useApp().clipboard.writeText(text)` sends a UTF-8 [OSC 52 clipboard request](https://invisible-island.net/xterm/ctlseqs/ctlseqs.html). The terminal must permit this operation; sending the request cannot confirm acceptance. `createApp(View, { clipboard })` overrides it with a `Clipboard` adapter containing async `writeText` and optional `readText`. No clipboard read query is sent to the terminal. `MemoryTerminal.clipboardText` provides an in-memory clipboard. Clipboard shortcut failures shut down through normal app error handling; direct API callers own their promise and errors. Delayed paste is discarded if the editor changes or unmounts before it completes.

## Scrolling and large collections

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

## Custom drawing and testing

`canvas(draw)` provides cell dimensions, `write(x, y, text, style)`, and `fill(rect, style)`. For pixels, pass a row-major RGBA buffer directly or call `draw.pixels(buffer)` from the callback:

```ts
canvas(
  {
    width: 2,
    height: 1,
    data: new Uint8Array([255, 0, 0, 255, 0, 128, 255, 255]),
  },
  { fit: "contain", renderer: "auto" },
).fill();

canvas(
  (draw) => {
    // Render at the reported terminal pixel resolution instead of stretching a small bitmap.
    if (draw.pixelWidth && draw.pixelHeight)
      draw.pixels(renderChart(draw.pixelWidth, draw.pixelHeight));
  },
  { fit: "fill" },
).fill();
```

`PixelBuffer` borrows its RGBA bytes; replace the buffer description when pixels change. `draw.pixelWidth` and `pixelHeight` follow the inner cell dimensions and terminal cell metrics, including resize. Give canvases explicit sizes or fill dimensions. Fits are `"contain"` (default), `"cover"`, and `"fill"`; they use physical cell proportions. Alpha composites against the painted background. Set an explicit hex or RGB background for predictable colors; named ANSI colors use a conventional palette and an unknown terminal background is treated as black.

The process adapter probes graphics support, then chooses Kitty → Sixel → Unicode quadrant blocks. `renderer` can request `"kitty"`, `"sixel"`, or `"quadrants"`; unsupported requests fall back to quadrants. Sixel uses a 216-color palette. Partial clipping crops the native raster; overlapping elements and callbacks mixing pixels with cell drawing use quadrants to preserve composition. Native image IDs belong to the terminal session and are deleted on unmount or shutdown. Kitty uploads use lossless compression, unchanged images retain their data, replacements are placed before old images are removed, and frames use synchronized output to avoid exposing partial updates. A new buffer still requires a native upload; large animated canvases have terminal-dependent throughput.

## Overlays, dialogs, and popovers

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

## Adapter testing

`MemoryTerminal` implements the same adapter contract as the process terminal. Inject it through `createApp(View, { terminal })`, dispatch `keyEvent()` or pointer events, resize it, and inspect `terminal.screen`. `app.flush()` awaits the current scheduled frame; effects can schedule subsequent frames. Async adapter writes provide backpressure, preventing overlapping output commits.

## Architecture and current limits

`element` owns immutable descriptions and public composition. `runtime` owns mounted identity, hooks, scheduling, focus, input behavior, and app cleanup. `layout` resolves styles, measures text/content, allocates whole cells, and positions the mounted tree. `render` draws clipped cells, captures pixel surfaces, and prepares native raster placements. `terminal` owns byte decoding, process streams, and terminal modes. Runtime coordinates these boundaries; terminal adapters never depend on components. Overlay placement belongs to layout, modal scopes and dismissal belong to runtime, and render draws viewport layers after ordinary content. Native raster encoding, image ownership, and terminal capability queries belong to terminal.

State updates reconcile descriptions, resolve styles, check geometry changes, lay out when necessary, paint, diff, await output, attach refs, and commit effects. Failed renders or writes trigger app cleanup. All sibling cleanups are attempted even if one throws. Custom components, styles, canvas elements, and terminal adapters are the supported extension points.

Paint-only and offset-only scroll updates skip layout. Geometry changes invalidate affected branches and their ancestors; measurement and placement reuse unchanged branches when their constraints and rectangles still match. Per-node measurement caches retain at most eight constraint combinations. Painting retains immutable cells and recomposes damaged rows through the complete clipping and stacking tree; cell comparison skips retained cell references. Child insertion/removal and escaped overflow can conservatively repaint the full viewport. Canvas callbacks remain invalidated each frame because their closures can read external state. `app.stats.layoutNodes` and `paintedCells` expose the work performed. Unicode segmentation uses `Intl.Segmenter`; wide-character classification uses a built-in approximation, so ambiguous widths and terminal-specific emoji presentation can differ. Inline rendering assumes exclusive writes to its reserved region. Trackpad feel and clipboard permission behavior across terminal applications still require manual verification; automated PTY and emulator tests cannot establish those properties.

## Development tools

`bun run format` uses Oxfmt and `bun run lint` uses Oxlint with the borrowed formatting and lint policies. ESLint runs only the file length, function length, nesting, and parameter limits that Oxlint does not provide. `bun run check` runs formatting checks, TypeScript, both lint passes, and tests. Terminal protocol parsers and their tests allow control-character regular expressions because ANSI decoding requires them.

## Terminal verification

`bun run check` includes byte-chunked input tests, an xterm-compatible headless emulator, and real process sessions driven through POSIX PTYs at 8 × 16 and 9 × 21 pixel cell sizes. The PTY tests exercise both screen modes, diagonal wheel bursts, scrollbar capture, OSC 52 output, shrink/expand recovery, Ctrl+C, and terminal restoration. They require Python 3's standard-library PTY support and skip on Windows or when Python is unavailable. They never access the host clipboard. Layout and retained-rendering stress tests compare optimized results with full layout and repaint across changing content, clipping, overlays, and small viewports.

For manual checks, run `bun run demo:interactions`, `bun examples/v1/scrollbars.ts`, and `bun run demo:layout` in each target terminal and inside tmux if used. Check equal physical travel on both axes, short diagonal swipes without delayed motion when inertia is off, dragging outside the track, copying Unicode into another app, and repeated shrink/expand cycles. Ghostty, iTerm2, Terminal.app, and tmux are manual targets, not verified compatibility claims. `bun run bench` measures headless updates and reports both virtual-list paint changes and geometry updates beside a 300-row unchanged subtree.
