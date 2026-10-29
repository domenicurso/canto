# Canto v2

A terminal UI library for Bun and TypeScript. Compose elements with ordinary functions, keep local state with hooks, and share immutable fluent styles.

**This is a breaking v2 alpha.** The package is currently private; use this checkout. The v1 renderer, signal runtime, widgets, and examples have been replaced.

## Documentation

Start with the [documentation wiki](docs/README.md), [getting started](docs/getting-started.md), or the [counter tutorial](docs/tutorial.md). Use the [API reference](docs/api/README.md) when you need signatures, options, defaults, and lifecycle contracts.

| Learn                                             | Build                                                                    | Understand                                       |
| ------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------ |
| [Components and state](docs/guides/components.md) | [Inputs and clipboard](docs/guides/input.md)                             | [Architecture](docs/architecture.md)             |
| [Layout and styling](docs/guides/layout.md)       | [Scrolling and lists](docs/guides/scrolling.md)                          | [Layout contract](docs/reference/layout.md)      |
| [Runnable examples](docs/examples.md)             | [Dialogs](docs/guides/overlays.md) · [Graphics](docs/guides/graphics.md) | [Compatibility](docs/reference/compatibility.md) |

## Run it

```sh
bun install
bun run demo:studio   # Release-planning workspace
bun run demo          # Full-screen dashboard
bun run demo:inline   # Inline counter
bun run check         # Formatting, types, lint, and tests
```

Bun 1.3.14 or newer is required. TypeScript 5 is the declared peer dependency.

## An application

```ts
import { button, column, createApp, text, useApp, useState } from "canto";

function Counter() {
  const [count, setCount] = useState(0);
  const app = useApp();
  return column(
    text(`Count: ${count}`),
    button("Increment", () => setCount((value) => value + 1)),
    button("Quit", () => app.stop()),
  ).gap(1);
}

await createApp(Counter, { mode: "inline" }).run();
```

In the checkout, use the local entry point as shown in [`examples/counter.ts`](examples/counter.ts). Tab moves focus, Enter activates a button, and Ctrl+C requests shutdown. `run()` owns terminal acquisition and cleanup and resolves when the session ends.

## Development

See [contributing](docs/contributing.md) for checks and terminal verification, [testing](docs/guides/testing.md) for `MemoryTerminal`, and [migration](docs/reference/migration.md) for the replaced v1 API.
