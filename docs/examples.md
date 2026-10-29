# Examples

[Documentation](README.md)

Run these commands from the repository after `bun install`.

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

## Rebuilt v1 examples

[`examples/v1/`](../examples/v1/) recreates all 12 original demos with the v2 API. The directory name describes their origin; these run on the new renderer.

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
| `debug.ts`             | Animated counter and the built-in frame inspector                             |
| `git.ts`               | Read-only Git status, refresh, and selection in the current working directory |
| `image.ts`             | PNG decoding and native graphics with aspect-preserving quadrant fallback     |

The console is composed explicitly from v2 elements. Every app includes the built-in inspector, initially hidden: use F3 for statistics, F12 or Ctrl+T for the example console, and Escape to close the active panel. Prompt and choice keep their accepted answer visible until Ctrl+C. The image example uses the example-only `pngjs` development dependency, composites transparency over the canvas background, and displays a built-in sample when no path is supplied; the original machine-specific image path is gone.

The [side-by-side v1/v2 comparison](../examples/v1/comparison.html) shows complete implementations of the same counter, including state, styling, controls, and lifecycle. The v1 listing targets the archived API; both listings are illustrative code, while `examples/counter.ts` is runnable v2 code.
