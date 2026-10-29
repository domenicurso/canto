# API reference

[Documentation](../README.md)

Import public values and types from `"canto"`; repository examples use the local [`index.ts`](../../index.ts). This reference covers that entry point. Symbols exported by individual source modules aren't automatically public package exports.

## Export index

| Area                                  | Exports                                                                                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Application](app.md)                 | `createApp`, `App`, `AppOptions`, `AppStatus`, `SelectionMode`, `SelectionControl`                                                                     |
| [Hooks](hooks.md)                     | `useState`, `useEffect`, `useMemo`, `useRef`, `useApp`, `useViewport`                                                                                  |
| [Elements](elements.md)               | `component`, `Element`, `Child`, `Component`, `text`, `row`, `column`, `box`                                                                           |
| [Controls](controls.md)               | `button`, `input`, `textarea`, `ButtonProps`, `InputProps`                                                                                             |
| [Collections](collections.md)         | `scroll`, `list`, `ScrollProps`, `ScrollPosition`, `ListOptions`                                                                                       |
| [Overlays](overlays.md)               | `overlay`, `OverlayProps`                                                                                                                              |
| [Styles](styles.md)                   | `style`, `StyleBuilder`, `Style`, `Color`, `Dimension`, `Padding`, `Border`, `BorderGlyphs`, `TextAlignment`, `Underline`, `Alignment`, `Distribution` |
| [Events and refs](events.md)          | `KeyEvent`, `PointerEvent`, `ElementRef`, `keyEvent`, `TerminalEvent`                                                                                  |
| [Graphics](graphics.md)               | `canvas`, `DrawingContext`, `PixelBuffer`, `CanvasOptions`                                                                                             |
| [Terminal and clipboard](terminal.md) | `MemoryTerminal`, `Terminal`, `Mode`, `CellSize`, `Clipboard`, `GraphicsCapabilities`, `ColorTheme`                                                    |
| [Diagnostics](diagnostics.md)         | `DebugControl`, `FrameStats`, `ContentFrameStats`, `PresentationStats`                                                                                 |

Signatures show callable shapes; tables explain defaults and constraints. Dimensions use terminal cells unless explicitly described as pixels, time, or bytes. Factories return immutable descriptions, and fluent methods return a new value. For complete runnable code, use the [tutorial](../tutorial.md) or [examples](../examples.md). Reference fragments identify application-supplied values alongside the code.
