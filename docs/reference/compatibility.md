# Terminal compatibility and troubleshooting

[Documentation](../README.md) · [Terminal API](../api/terminal.md)

Canto targets Bun terminal sessions. Automated tests cover decoding, emulator output, and POSIX PTY sessions; Ghostty, iTerm2, Terminal.app, and tmux are manual targets rather than blanket verified compatibility claims.

## Capabilities and fallbacks

| Feature              | Behavior and limitation                                                                                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Graphics             | Automatic choice is Kitty, then Sixel, then Unicode quadrant cells. Unsupported explicit native renderers also fall back to quadrants. Sixel uses a 216-color palette. |
| Cell metrics         | Pixel queries supply cell size; missing replies use 8 × 16 pixels. Pixel wheel deltas and image proportions use these metrics.                                         |
| Theme colors         | OSC 10/11 and OSC 4 queries discover defaults and the ANSI palette. Missing values use conventional colors, default foreground `#c0c0c0`, and background `#000000`.    |
| Underlines           | Requested shape and color sequences are emitted without a support probe; presentation depends on the terminal.                                                         |
| Clipboard            | Process output sends OSC 52 writes; the terminal decides whether to accept them. Reads require an injected adapter. Native paste normally arrives as bracketed input.  |
| Inline pointer input | Coordinate mapping needs a cursor-position reply. Keyboard operation remains available without it.                                                                     |
| Unicode              | Grapheme segmentation uses `Intl.Segmenter`; width classification is approximate. Ambiguous-width characters and terminal-specific emoji can differ.                   |
| Redirected output    | One plain-text frame is written and the process session stops.                                                                                                         |

Opacity blends reported terminal colors, so desktop transparency or wallpaper isn't part of the composition. Native image throughput depends on the terminal, image size, and update rate; a replacement buffer can require another upload.

## Common symptoms

| Symptom                         | Check and remedy                                                                                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nothing appears in a canvas     | Give it explicit dimensions or `.fill()` within a bounded parent. Verify RGBA length is exactly `width * height * 4`.                                               |
| A child ignores available space | Content sizing is the default. Set a fill dimension and inspect parent bounds; percentages need definite parent dimensions.                                         |
| A pane won't collapse           | Numeric dimensions don't shrink by default. Use `.shrink(1)` or a fill dimension, and `.minWidth(0)` / `.minHeight(0)` where full collapse is intended.             |
| State resets after reordering   | Define component factories outside rendering and assign stable sibling keys. Virtualized off-screen items unmount, so persistent item state belongs above the list. |
| Hooks throw                     | Call them only in mounted render callbacks with stable ordering. Set state in events or effects, not during rendering.                                              |
| Mouse controls stop working     | Native selection mode disables application tracking. Switch back through a keyboard action calling `selection.setMode("text")`.                                     |
| Copy appears to do nothing      | The terminal may reject OSC 52. Supply a host `Clipboard` adapter when confirmed writes or reads are required.                                                      |
| Inline output becomes corrupted | Other stdout writers can overwrite the reserved region. Render live logs as elements or print after shutdown.                                                       |
| A dialog remains after Escape   | `onDismiss` requests a state change; the application must remove the overlay. Check dismissal flags and whether the inspector consumes Escape first.                |
| F3 never reaches a handler      | The inspector owns F3 by default. Set `{ debug: false }` to release that shortcut.                                                                                  |

## Report an issue

Include the Canto revision, Bun version, operating system, terminal and multiplexer versions, session mode, smallest reproducing view, and whether it fails under `MemoryTerminal`. For rendering or performance problems, include viewport dimensions and relevant [frame statistics](../api/diagnostics.md); output completion doesn't measure emulator GPU display latency.
