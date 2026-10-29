# Tutorial: a stateful counter

[Documentation](README.md) · Prerequisite: [Getting started](getting-started.md)

This example connects component state, keyboard-accessible controls, reusable styles, and orderly shutdown. The complete runnable version is [`examples/counter.ts`](../examples/counter.ts); run `bun run demo:inline` from the checkout.

## 1. Own state in the mounted root

`useState(0)` gives each mounted instance a value and setter. Compute derived values during rendering, and update state in event handlers or effects. A functional update reads the latest value when several updates share a frame.

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
const action = style().focused(style().background("cyan").color("black"));

function Counter() {
  const [count, setCount] = useState(0);
  const app = useApp();

  return column(
    text("Counter").bold(),
    text(`Count: ${count} · Doubled: ${count * 2}`),
    row(
      button("−", () => setCount((value) => value - 1)).use(action),
      button("+", () => setCount((value) => value + 1)).use(action),
      button("Quit", () => app.stop()).use(action),
    ).gap(3),
  )
    .use(panel)
    .gap(1);
}

await createApp(Counter, { mode: "inline" }).run();
```

When saving this inside `examples/`, change `"canto"` to `"../index"`. The package remains private, so a bare package import requires a local package mapping.

## 2. Compose and style the controls

`column` arranges children vertically and `row` arranges them horizontally. Dimensions, padding, and gaps use terminal cells. The panel's border and padding contribute to its outer size, so they reduce the space available for content.

`style()` builders are immutable and safe to reuse. `.use(panel)` merges that style into the returned column. The action's focused variant makes the active button visible during Tab navigation; buttons already handle Enter, Space, and pointer activation.

## 3. Let the session own resources

`createApp(Counter)` doesn't render until `run()`. The Quit handler asks the session to stop; `run()` resolves after effect cleanup and terminal restoration. Printing an accepted result or starting another application belongs after that await.

To add a timer, put `setInterval` inside `useEffect` and return a cleanup calling `clearInterval`. Creating timers in `Counter()` itself would create another timer on each render. The [component guide](guides/components.md) and [log example](../examples/logs.ts) cover effects and cleanup.

## 4. Grow the application

Extract repeated stateful controls with `component()`, defined outside render functions. Give dynamic siblings stable `.key(id)` values so their state follows identity during reordering. Add a controlled [input](api/controls.md), or test the counter through a [MemoryTerminal](guides/testing.md) before involving real terminal I/O.
