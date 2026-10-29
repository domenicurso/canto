# Application

[API index](README.md) · [Source](../../src/runtime/app.ts) · [Options and cleanup](../../src/runtime/session.ts)

## createApp and App

```ts
createApp(render: () => Child, options?: AppOptions): App
new App(render: () => Child, options?: AppOptions)
```

Creation is inert: it doesn't acquire the terminal, render components, or run effects. Use one instance per session; `run()` rejects if called again. The root is a mounted component and may use hooks.

## AppOptions

| Property      | Type            | Default and behavior                                                                                   |
| ------------- | --------------- | ------------------------------------------------------------------------------------------------------ |
| `mode`        | `Mode`          | `"fullscreen"`; `"inline"` reserves normal-output space                                                |
| `terminal`    | `Terminal`      | Process adapter; inject `MemoryTerminal` for tests                                                     |
| `signal`      | `AbortSignal`   | None; abort requests shutdown, including before startup                                                |
| `exitOnCtrlC` | `boolean`       | `true`; `false` releases the keyboard shortcut to the app, while process signal handling still applies |
| `clipboard`   | `Clipboard`     | Overrides `terminal.clipboard`; without either adapter, writes reject                                  |
| `selection`   | `SelectionMode` | `"text"`; `"native"` disables application mouse tracking                                               |
| `debug`       | `boolean`       | `true`; `false` releases F3 while retaining programmatic inspector access                              |

## Methods

| Member                   | Contract                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `run(): Promise<void>`   | Acquires the terminal, mounts the root, and waits for shutdown. Resolves after cleanup; rejects on failure after cleanup. Canto never calls `process.exit()`. |
| `stop(): void`           | Requests shutdown; repeated calls while stopping or stopped do nothing                                                                                        |
| `schedule(): void`       | Requests a frame while running and coalesces work; state setters normally do this automatically                                                               |
| `flush(): Promise<void>` | Awaits the in-flight frame or renders work while running; doesn't start the app or wait for all future effect-driven frames                                   |

Only one process terminal session can run at once; injected adapters have independent ownership. Full-screen sessions restore the alternate screen; inline sessions retain their final frame in scrollback. Redirected process output presents one plain-text frame and stops. Ctrl+C, SIGINT, SIGTERM, an abort signal, and `stop()` enter cleanup.

Cleanup waits for active output, disposes input ownership, clears focus, unmounts components and effects, and stops the adapter. Sibling cleanups are attempted even if one fails. The first recorded failure is retained for `run()` rejection.

## Read-only properties

| Property    | Shape and meaning                                                              |
| ----------- | ------------------------------------------------------------------------------ |
| `status`    | `AppStatus`: `"created"`, `"starting"`, `"running"`, `"stopping"`, `"stopped"` |
| `viewport`  | `{ width: number; height: number }`, in cells                                  |
| `clipboard` | Effective `Clipboard`; direct callers own its promises and errors              |
| `selection` | `SelectionControl`, below                                                      |
| `debug`     | `DebugControl`: `visible`, `setVisible(boolean)`, `toggle()`                   |
| `stats`     | `Readonly<FrameStats>` for the latest completed frame; initially zero counters |

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
