# Getting started

[Documentation](README.md) · Next: [Counter tutorial](tutorial.md)

## Requirements and installation

Use Bun **1.3.14 or newer** and TypeScript **5**. Canto's `package.json` marks this alpha private; these instructions use the repository rather than assuming an npm release is available.

From your Canto checkout:

```sh
bun install
bun run demo:inline
```

Tab between buttons, press Enter or Space to activate, and press Ctrl+C to quit. For a full-screen workspace, run `bun run demo:studio`. See the [example catalog](examples.md) for smaller demonstrations of individual features.

## Create an application

Save this as `examples/hello.ts` in the checkout and run `bun examples/hello.ts`. Repository examples import the local entry point; consumers with a local package mapping can import the same exports from `"canto"`.

```ts
import { button, column, createApp, text, useApp } from "../index";

function Hello() {
  const app = useApp();
  return column(
    text("Hello from Canto").bold().color("cyan"),
    button("Quit", () => app.stop()).autoFocus(),
  )
    .padding(1)
    .border("rounded")
    .gap(1);
}

await createApp(Hello, { mode: "inline" }).run();
```

The root function returns immutable element descriptions. Fluent calls return new descriptions, so retain or return their result. Hooks such as `useApp()` run inside the root or a mounted `component()` callback.

## Choose a session mode

| Mode                     | Behavior                                                                    | Use for                          |
| ------------------------ | --------------------------------------------------------------------------- | -------------------------------- |
| `"fullscreen"` (default) | Uses the alternate screen and restores the terminal on shutdown             | Dashboards and editors           |
| `"inline"`               | Reserves a region in normal output and leaves the final frame in scrollback | Prompts and compact progress UIs |

`createApp()` is inert. Await `run()` to acquire the terminal and keep the session alive. `app.stop()`, Ctrl+C, SIGINT, SIGTERM, or an optional abort signal requests shutdown; `run()` resolves after cleanup and rejects on failure. App instances are single-use. Redirected process output produces one plain-text frame and exits.

Avoid writing to stdout while Canto owns its screen region. Use application elements for live output, or print after `run()` resolves. Only one process terminal session can run at once; injected adapters have separate ownership.

## Continue

Build the [counter tutorial](tutorial.md), learn [components and state](guides/components.md), or look up [application options](api/app.md). The [compatibility guide](reference/compatibility.md) explains graphics, clipboard, Unicode, and terminal limitations.
