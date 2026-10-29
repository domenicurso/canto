# Terminal adapters and clipboard

[API index](README.md) · [Transport](../../src/terminal/transport.ts) · [Clipboard](../../src/terminal/clipboard.ts)

## Terminal and Mode

`Mode` is `"fullscreen" | "inline"`. An injected `Terminal` owns its transport and reports dimensions in terminal cells. The default process adapter owns raw mode, streams, signal subscriptions through the session, capabilities, inline placement, and restoration.

```ts
interface Terminal {
  readonly width: number;
  readonly height: number;
  readonly cellSize?: CellSize;
  readonly theme?: ColorTheme;
  readonly graphics?: GraphicsCapabilities;
  readonly presentation?: Readonly<PresentationStats>;
  readonly clipboard?: Clipboard;
  setMouseTracking?(enabled: boolean): Promise<void>;
  start(mode: Mode, emit: (event: TerminalEvent) => void): Promise<void>;
  present(screen: Screen, output: string): Promise<void>;
  stop(): Promise<void>;
}
```

`start` acquires resources and establishes event delivery. `present` receives the composed screen and ANSI cell output; resolve only when the write and backpressure complete. Canto awaits presentations to prevent overlapping commits. `stop` releases resources, including partial startup. Update dimensions before emitting resize. Optional `setMouseTracking` enables native selection mode; an adapter lacking it cannot switch to native mode successfully.

`Screen` appears in the structural transport contract but isn't re-exported from `canto`. Derive method types from `Terminal` when implementing an adapter, for example `Parameters<Terminal["present"]>[0]` for a screen parameter. Avoid importing the internal class unless your integration deliberately owns that coupling.

## Capability types

| Type                   | Field                        | Field type                                                             | Notes                      |
| ---------------------- | ---------------------------- | ---------------------------------------------------------------------- | -------------------------- |
| `CellSize`             | `width`, `height`            | `number`                                                               | Read-only; pixels per cell |
| `GraphicsCapabilities` | `kitty`, `sixel`             | `boolean`                                                              |                            |
| `ColorTheme`           | `foreground?`, `background?` | `readonly [number, number, number]`                                    | Read-only; RGB             |
| `ColorTheme`           | `palette?`                   | `Readonly<Partial<Record<number, readonly [number, number, number]>>>` | Read-only; ANSI indexes    |

The process adapter probes cell metrics, graphics, and colors. Missing metrics fall back to 8 × 16 pixels; graphics fall back to quadrants; missing theme entries use conventional colors. See [compatibility](../reference/compatibility.md) for limits.

## MemoryTerminal

```ts
new MemoryTerminal((width = 80), (height = 24));
```

| Member                                  | Type                      | Notes                  |
| --------------------------------------- | ------------------------- | ---------------------- |
| `dispatch(event: TerminalEvent)`        | `void`                    | Input event            |
| `resize(width: number, height: number)` | `void`                    | Emits resize           |
| `screen`                                | `Screen \| undefined`     | Latest frame           |
| `frames`                                | `Screen[]`                | Full history           |
| `output`                                | `string[]`                | Raw output history     |
| `started`, `stopped`                    | `boolean`                 | Lifecycle flags        |
| `clipboardText`                         | `string`                  | In-memory contents     |
| `clipboard`                             | `Clipboard`               | Reads and writes       |
| `mouseTracking`                         | `boolean`                 | Initially `true`       |
| `setMouseTracking(enabled: boolean)`    | `Promise<void>`           |                        |
| `cellSize`                              | `CellSize`                | Initially 8 × 16       |
| `graphics`                              | `GraphicsCapabilities`    | Initially both `false` |
| `theme`                                 | `ColorTheme \| undefined` | Configurable           |

`width` and `height` are public mutable values, but use `resize()` when the app must observe a size change. `screen.toString()` returns rows of plain text with trailing spaces trimmed. `screen.get(x, y)` exposes a cell's text, style, and wide-glyph continuation state. Treat captured screens as read-only snapshots. Test adapters keep history for the entire session, so long-running tests retain those frames.

See [testing](../guides/testing.md) for complete session setup and cleanup.

## Clipboard

```ts
interface Clipboard {
  writeText(text: string): Promise<void>;
  readText?(): Promise<string>;
}
```

Inject through `AppOptions.clipboard` to override the terminal adapter. The process adapter sends UTF-8 OSC 52 writes, which can't confirm acceptance; it doesn't send terminal read queries. Native bracketed paste normally supplies text independently of `readText`.

Alt+W or Ctrl+Insert copies; Ctrl+X cuts editable selection. Ctrl+V or Shift+Insert reads only when the adapter provides reads. Clipboard shortcut failures enter app shutdown; direct API calls must await and handle their own errors. Delayed paste is discarded if the editor changes or unmounts before it completes. See [selection and clipboard](../guides/input.md).
