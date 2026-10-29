# Contributing

[Documentation](README.md)

## Local checks

`bun run format` uses Oxfmt and `bun run lint` uses Oxlint with the borrowed formatting and lint policies. ESLint runs only the file length, function length, nesting, and parameter limits that Oxlint does not provide. `bun run check` runs formatting checks, TypeScript, both lint passes, and tests. Terminal protocol parsers and their tests allow control-character regular expressions because ANSI decoding requires them.

## Terminal verification

`bun run check` includes byte-chunked input tests, an xterm-compatible headless emulator, and real process sessions driven through POSIX PTYs at 8 × 16 and 9 × 21 pixel cell sizes. The PTY tests exercise both screen modes, diagonal wheel bursts, scrollbar capture, OSC 52 output, shrink/expand recovery, Ctrl+C, and terminal restoration. They require Python 3's standard-library PTY support and skip on Windows or when Python is unavailable. They never access the host clipboard. Layout and retained-rendering stress tests compare optimized results with full layout and repaint across changing content, clipping, overlays, and small viewports.

For manual checks, run `bun run demo:interactions`, `bun examples/v1/scrollbars.ts`, and `bun run demo:layout` in each target terminal and inside tmux if used. Check equal physical travel on both axes, short diagonal swipes without delayed motion when inertia is off, dragging outside the track, copying Unicode into another app, and repeated shrink/expand cycles. Ghostty, iTerm2, Terminal.app, and tmux are manual targets, not verified compatibility claims. `bun run bench` measures headless updates and reports both virtual-list paint changes and geometry updates beside a 300-row unchanged subtree.

## Documentation maintenance

The wiki is Markdown in `docs/`, so it can be read locally or browsed on GitHub without a separate build. Start at [the documentation home](README.md); its API index covers the package entry point in [`index.ts`](../index.ts). Public examples import from `canto`; repository examples import from the local entry point.

When changing an export, update its API page and the [API index](api/README.md). Document defaults, units, lifecycle, expected failures, and ownership alongside signatures. Add task-oriented examples to guides when a signature alone doesn't explain usage. Keep the [layout](reference/layout.md) and [styling](reference/styling.md) contracts canonical; the root files preserve old links.

Run `bun run format` and `bun run check` after changes. Verify local Markdown links and type-check complete examples; fragments must identify their application-supplied values. Don't present an alpha checkout as a published package or imply terminal compatibility from headless tests.

## Structure inspiration

[Textual](https://textual.textualize.io/guide/) separates learning guides, widget/style references, and [module APIs](https://textual.textualize.io/api/). Canto uses that separation so tutorials don't have to carry every option. [Ink](https://github.com/vadimdemedes/ink) places examples near component and hook APIs; Canto's reference follows that example while documenting its own function-based runtime. [Blessed](https://github.com/chjj/blessed#documentation) groups terminal APIs by screen and widget responsibility; Canto groups its reference by application, elements, controls, and terminal boundaries. These are organizational references, not compatibility claims.
