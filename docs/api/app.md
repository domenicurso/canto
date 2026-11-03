# Application

[API index](README.md) · [Source](../../src/runtime/app.ts) · [Options and cleanup](../../src/runtime/session.ts)

## createApp and App

```ts
createApp(render: () => Child, options?: AppOptions): App
new App(render: () => Child, options?: AppOptions)
```

Creation is inert: it doesn't acquire the terminal, render components, or run effects. Use one instance per session; `run()` rejects if called again. The root is a mounted component and may use hooks.

## AppOptions

| Property      | Type            | Default              | Notes                   |
| ------------- | --------------- | -------------------- | ----------------------- |
| `mode`        | `Mode`          | `"fullscreen"`       |                         |
| `terminal`    | `Terminal`      | Process adapter      |                         |
| `signal`      | `AbortSignal`   | —                    | Abort requests shutdown |
| `exitOnCtrlC` | `boolean`       | `true`               | Keyboard shortcut only  |
| `clipboard`   | `Clipboard`     | `terminal.clipboard` | Override                |
| `selection`   | `SelectionMode` | `"text"`             |                         |
| `debug`       | `boolean`       | `true`               | F3 shortcut             |

Disabling `exitOnCtrlC` releases the keyboard shortcut; process signals still request shutdown. `debug: false` releases F3 while retaining programmatic inspector access. Without a clipboard adapter, writes reject. An already-aborted signal prevents mounting.

## Methods

| Method       | Returns         | Notes                |
| ------------ | --------------- | -------------------- |
| `run()`      | `Promise<void>` | Single-use session   |
| `stop()`     | `void`          | Requests shutdown    |
| `schedule()` | `void`          | Queues a frame       |
| `flush()`    | `Promise<void>` | Awaits current frame |

`run()` resolves after cleanup and rejects on failure; Canto never calls `process.exit()`. `stop()` is idempotent while stopping or stopped. `schedule()` coalesces requests while running; state setters call it automatically. `flush()` doesn't start the app or await future effect-driven frames.

Only one process terminal session can run at once; injected adapters have independent ownership. Full-screen sessions restore the alternate screen; inline sessions retain their final frame in scrollback. Redirected process output presents one plain-text frame and stops. Ctrl+C, SIGINT, SIGTERM, an abort signal, and `stop()` enter cleanup.

Cleanup waits for active output, disposes input ownership, clears focus, unmounts components and effects, and stops the adapter. Sibling cleanups are attempted even if one fails. The first recorded failure is retained for `run()` rejection.

## Read-only properties

| Property    | Type                                | Notes                  |
| ----------- | ----------------------------------- | ---------------------- |
| `status`    | `AppStatus`                         | Session state          |
| `viewport`  | `{ width: number; height: number }` | Cells                  |
| `clipboard` | `Clipboard`                         | Effective adapter      |
| `selection` | `SelectionControl`                  |                        |
| `debug`     | `DebugControl`                      |                        |
| `stats`     | `Readonly<FrameStats>`              | Latest completed frame |

`AppStatus` is `"created" | "starting" | "running" | "stopping" | "stopped"`. Frame counters start at zero. Direct clipboard callers own their promises and errors.

## SelectionMode and SelectionControl

```ts
type SelectionMode = "text" | "native";
interface SelectionControl {
  readonly mode: SelectionMode;
  setMode(mode: SelectionMode): Promise<void>;
}
```

Await `setMode()` to finish changing mouse ownership. Transitions serialize so rapid toggles don't leave tracking in the wrong mode. Native mode releases pointer activation, hover, wheels, and scrollbar dragging to the terminal; keyboard controls continue to work. Injected adapters need optional `setMouseTracking` support. See [selection behavior](../guides/input.md).

## Example

```ts
import { createApp, text } from "canto";

const controller = new AbortController();
const app = createApp(() => text("Waiting…"), {
  mode: "inline",
  signal: controller.signal,
});
const timeout = setTimeout(() => controller.abort(), 1000);
try {
  await app.run();
} finally {
  clearTimeout(timeout);
}
```

See [testing](../guides/testing.md) for synthetic input and [diagnostics](diagnostics.md) for statistics definitions.
