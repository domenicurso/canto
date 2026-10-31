# Terminal compatibility and troubleshooting

[Documentation](../README.md) · [Terminal API](../api/terminal.md)

Canto targets Bun terminal sessions. Automated tests cover decoding, emulator output, POSIX PTY sessions, and isolated real tmux servers when tmux is installed. CI requires tmux on both Linux and macOS. Ghostty, iTerm2, and Terminal.app still need direct verification rather than blanket compatibility claims.

## Capabilities and fallbacks

| Feature              | Behavior and limitation                                                                                                                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Graphics             | Automatic choice is Kitty, then Sixel, then Unicode quadrant cells. Unsupported explicit native renderers also fall back to quadrants. Sixel uses a 216-color palette.                                      |
| Cell metrics         | Pixel queries supply cell size; missing replies use 8 × 16 pixels. Pixel wheel deltas and image proportions use these metrics.                                                                              |
| Theme colors         | OSC 10/11 and OSC 4 queries discover defaults and the ANSI palette. Missing values use conventional colors, default foreground `#c0c0c0`, and background `#000000`.                                         |
| Underlines           | Requested shape and color sequences are emitted without a support probe; presentation depends on the terminal.                                                                                              |
| Clipboard            | Process output sends OSC 52 writes; the terminal decides whether to accept them. Reads require an injected adapter. Native paste normally arrives as bracketed input.                                       |
| Inline pointer input | Coordinate mapping needs a cursor-position reply. Keyboard operation remains available without it.                                                                                                          |
| Unicode              | Grapheme segmentation uses `Intl.Segmenter`; widths use Bun's maintained `stringWidth` tables, including text versus emoji presentation. Ambiguous-width characters and terminal-specific emoji can differ. |
| Redirected output    | One plain-text frame is written and the process session stops.                                                                                                                                              |

Opacity blends reported terminal colors, so desktop transparency or wallpaper isn't part of the composition. Native image throughput depends on the terminal, image size, and update rate; a replacement buffer can require another upload.

Incomplete escape sequences expire after 30 ms without input; only a lone Escape becomes a key event. Incomplete control packets over 4,096 UTF-16 code units are discarded even while input continues. Bracketed pastes allow a 5-second idle gap and at most 1,048,576 UTF-16 code units. An abandoned or oversized paste is discarded, so its contents cannot become application shortcuts; an oversized paste drains through its closing delimiter or idle timeout.

## Keyboard protocols and terminal shortcuts

Process sessions push the [Kitty keyboard protocol](https://sw.kovidgoyal.net/kitty/keyboard-protocol/) disambiguation flag and pop it before leaving the active screen on shutdown. Ordinary typing remains UTF-8. The decoder accepts CSI-u, xterm modifyOtherKeys, legacy modified arrows, and modifier/event subfields. Press and repeat events become `KeyEvent`s; release reports are ignored because the API describes actions rather than held-key state. Legacy terminals retain their ordinary input behavior.

Ghostty's default macOS bindings send Alt+Left as `ESC b` and Alt+Right as `ESC f`; seeing Alt+B/F is expected, and both perform word navigation. Legacy uppercase Alt letters retain an inferred Shift modifier so `ESC B/F` can extend word selection; Caps Lock and Shift cannot be distinguished in that legacy encoding. Enhanced reports preserve the actual modifier bits.

OS shortcuts and [Ghostty keybindings](https://ghostty.org/docs/config/keybind) can consume or replace a chord before Canto receives it. A key that leaves the display unchanged may have been consumed even if no desktop or window visibly moves. Canto does not change terminal bindings or system shortcuts. If literal Alt+Left/Right key identities are required, remove Ghostty's corresponding `esc:b`/`esc:f` overrides in the user's terminal configuration; ordinary Canto word editing works with either representation.

## Record a real-terminal check

Run `bun run terminal:check` in each target terminal, then `bun run terminal:check inline`, and repeat inside tmux. The screen displays Unicode alignment samples, palette colors, modified-key reports, clipboard copy/paste, and mouse controls. Shrink and expand the terminal, then use Tab/Enter or click to cycle each observed verdict through pass, fail, and unverified. Ctrl+C restores the session and prints JSON with the terminal/version environment, Bun/platform, screen mode, cell metrics, graphics replies, and observed results. The `keyboard` section includes the latest 16 input chunks (up to 64 bytes each, as hex) and 16 decoded keys, so a missing key can be distinguished from an unrecognized sequence. Missing environment fields stay `unknown`; unchecked items stay `unverified`.

The report records observations rather than certifying a terminal automatically. Run the pixel demo separately for native Kitty/Sixel display and graphics performance. Redirected checklist runs cannot observe an emulator and leave results unverified. Keep reports outside the checkout unless a maintained compatibility record is being added deliberately.

`bun test src/terminal/tmux.test.ts` runs fullscreen and inline sessions in private sockets. It exercises Unicode, text input, incomplete-sequence recovery, focus/activation, shrink/expand, and successful process exit without touching existing tmux sessions. It skips explicitly when tmux is absent; the CI workflow installs tmux so these cases must run there.

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
