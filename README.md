# Canto v2

A terminal UI framework for Bun and TypeScript. Compose elements with ordinary functions, keep local state with hooks, and share immutable fluent styles.

This is a breaking, from-scratch v2 alpha. The v1 renderer, signal runtime, widgets, and examples have been replaced.

## Run it

```sh
bun install
bun run demo          # Full-screen project dashboard
bun run demo:inline   # Inline counter
bun run check        # Formatting, type checking, lint, and tests
bun run bench        # Headless 10,000-item virtual list benchmark
```

## More examples

| Command                     | What it demonstrates                                                          |
| --------------------------- | ----------------------------------------------------------------------------- |
| `bun run demo:form`         | Controlled inputs, multiline notes, validation, and disabled actions          |
| `bun run demo:layout`       | Fixed and weighted panes, wrapping, scrolling, and an absolute badge          |
| `bun run demo:tasks`        | Adding/removing keyed components and preserving local state during reordering |
| `bun run demo:logs`         | Effect cleanup, a bounded event history, pause/resume, and follow mode        |
| `bun run demo:virtual-list` | Filtering 10,000 projects, virtualized rows, and selection                    |
| `bun run demo:canvas`       | Animated custom drawing, resize-aware geometry, and pause/reset controls      |
| `bun run demo:styles`       | Immutable shared styles, mixed text spans, and interaction variants           |

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
| `image.ts`             | PNG decoding and aspect-preserving half-block rendering                       |

Console and debug panels are composed explicitly from v2 elements. Use F3 for statistics, F12 or Ctrl+T for the console, and Escape to close it. Prompt and choice keep their accepted answer visible until Ctrl+C. The image example uses the example-only `pngjs` development dependency, composites transparency over black, and displays a built-in sample when no path is supplied; the original machine-specific image path is gone.

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

Active interaction styles override base declarations in this order: hovered, focused, pressed, disabled. Later styles merge each variant independently. Editors additionally support `.selected(style())`. Text attributes inherit; layout, backgrounds, and borders do not. Transparent children preserve the background already painted beneath them. Colors support named ANSI colors, RGB tuples, and three- or six-digit hex strings.

Read [the layout contract](LAYOUT_SPEC.md) for sizing, allocation, wrapping, clipping, and positioning rules.

## Inputs, focus, and events

```ts
input({ value: query, onChange: setQuery, placeholder: "Search…" }).autoFocus();
input({ defaultValue: "untitled", onSubmit: save });
textarea({ value: notes, onChange: setNotes }).width("fill").height(8);
```

Controlled values require `onChange`; uncontrolled values accept `defaultValue`. Both support `disabled`, `readOnly`, and placeholder text. Inputs submit on Enter; textareas insert newlines. Editing preserves graphemes, supports Shift+arrows, Ctrl+A selection, Home/End, deletion, and bracketed paste. Textarea Up/Down moves between logical lines.

Buttons, editors, and scrolling regions participate in Tab navigation. `.focusable()`, `.tabIndex()`, `.autoFocus()`, `.onFocus()`, and `.onBlur()` customize it. Negative tab indexes permit programmatic focus while excluding Tab traversal. `.ref()` receives a mounted handle with `focus()`, `scrollTo()`, and a live `rect`; it receives `null` when detached.

`.onKey()` bubbles structured events through ancestors. `preventDefault()` suppresses default editing or activation; `stopPropagation()` stops bubbling. Buttons activate on Enter, Space, or pointer release inside the pressed button. `.onMouse()` exposes pointer events, and `.hovered()` styles their ancestors. Inline mouse coordinates require a terminal cursor-position reply; keyboard operation remains available if the terminal does not reply.

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

Scroll regions support controlled or default offsets, vertical/horizontal/both axes, automatic/hidden/visible scrollbars, and stable gutters. Arrow keys, Page Up/Down, mouse wheels, and refs move the viewport. Focus navigation reveals newly focused descendants. Hidden scrollbars reserve no gutter, including with `gutter: "stable"`; visible thumbs use eighth-cell Unicode blocks.

Native wheel reports move in terminal-provided cell units; terminals that normalize trackpad movement already account for cell aspect ratio. Adapters can supply `deltaMode: "pixel"` with `deltaX` and `deltaY`, which Canto converts using `terminal.cellSize`. The process adapter queries cell dimensions and falls back to 8 × 16 pixels when unsupported. Arrow keys move one cell. Wheel bursts coalesce before rendering and preserve both axes of diagonal gestures.

Physics defaults to `"instant"`, so Canto adds no motion after input stops. An object enables inertia: `friction` is the positive exponential decay rate per second (default 8), and `momentum` scales the added travel (default 2; zero disables it). Existing trackpad momentum can combine with this effect, so leave physics off when the terminal already supplies the desired motion. The scrollbars demo toggles inertia with I and bars with B.

`list()` mounts visible rows plus one row of overscan on each side. Row heights must be fixed, positive integers. Off-screen rows unmount; keep persistent item state in the dataset or a parent component. Ordinary `.map()` intentionally evaluates every item and is appropriate for small collections.

`useViewport()` returns `{ width, height }` in cells and rerenders its component on resize. Use it to stack panes or reduce padding under tight constraints; `examples/layout.ts` demonstrates both. Inline output is clipped to the available terminal height and repainted when the viewport changes.

## Custom drawing and testing

`canvas(draw)` gives you local dimensions, `write(x, y, text, style)`, and `fill(rect, style)`. It participates in normal layout, clipping, backgrounds, refs, and event routing. Give it an explicit size or fill dimensions.

`MemoryTerminal` implements the same adapter contract as the process terminal. Inject it through `createApp(View, { terminal })`, dispatch `keyEvent()` or pointer events, resize it, and inspect `terminal.screen`. `app.flush()` awaits the current scheduled frame; effects can schedule subsequent frames. Async adapter writes provide backpressure, preventing overlapping output commits.

## Architecture and current limits

`element` owns immutable descriptions and public composition. `runtime` owns mounted identity, hooks, scheduling, focus, input behavior, and app cleanup. `layout` resolves styles, measures text/content, allocates whole cells, and positions the mounted tree. `render` draws clipped cells and emits changed runs. `terminal` owns byte decoding, process streams, and terminal modes. Runtime coordinates these boundaries; terminal adapters never depend on components.

State updates reconcile descriptions, resolve styles, check geometry changes, lay out when necessary, paint, diff, await output, attach refs, and commit effects. Failed renders or writes trigger app cleanup. All sibling cleanups are attempted even if one throws. Custom components, styles, canvas elements, and terminal adapters are the supported extension points.

Paint-only and offset-only scroll updates skip layout, but geometry changes currently lay out the whole mounted tree. Painting and cell comparison cover the viewport each frame. Unicode segmentation uses `Intl.Segmenter`; wide-character classification uses a built-in approximation, so ambiguous widths and terminal-specific emoji presentation can differ. Inline rendering assumes exclusive writes to its reserved region. Clipboard integration, drag selection, scrollbar dragging, and cross-terminal conformance testing are not included in this alpha.

## Development tools

`bun run format` uses Oxfmt and `bun run lint` uses Oxlint with the borrowed formatting and lint policies. ESLint runs only the file length, function length, nesting, and parameter limits that Oxlint does not provide. `bun run check` runs formatting checks, TypeScript, both lint passes, and tests. Terminal protocol parsers and their tests allow control-character regular expressions because ANSI decoding requires them.
