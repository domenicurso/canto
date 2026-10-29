# Canto documentation

Canto is a terminal UI library for Bun and TypeScript. Describe a tree with functions, keep component state in hooks, and style elements with immutable fluent builders. These docs cover **2.0.0-alpha.1**, the current private v2 checkout; v1 APIs were replaced.

## Start here

1. [Getting started](getting-started.md) — run the checkout and build your first application.
2. [Counter tutorial](tutorial.md) — connect state, events, styles, and session shutdown.
3. [Examples](examples.md) — runnable forms, dashboards, lists, graphics, and dialogs.

## Guides

| Task                                      | Read                                             |
| ----------------------------------------- | ------------------------------------------------ |
| Preserve state and own subscriptions      | [Components and hooks](guides/components.md)     |
| Size panes, wrap text, and share styles   | [Layout and styling](guides/layout.md)           |
| Edit text, move focus, select and copy    | [Input and clipboard](guides/input.md)           |
| Scroll content or virtualize a collection | [Scrolling and lists](guides/scrolling.md)       |
| Open a dialog or anchor a menu            | [Dialogs and popovers](guides/overlays.md)       |
| Draw cells, charts, or RGBA images        | [Canvas and graphics](guides/graphics.md)        |
| Test interactions without a real terminal | [Testing](guides/testing.md)                     |
| Inspect frame work and output costs       | [Debugging and performance](guides/debugging.md) |

## Reference

- [API index](api/README.md) — every export from `canto`, organized by responsibility.
- [Layout contract](reference/layout.md) — exact measurement, allocation, clipping, and invalidation rules.
- [Styling reference](reference/styling.md) — inheritance, interaction combinations, parts, opacity, and theme colors.
- [Terminal compatibility and troubleshooting](reference/compatibility.md) — capability fallbacks and common symptoms.
- [Migrating from v1](reference/migration.md) — replacement concepts and runnable examples.

## Contributing

Read [architecture](architecture.md) for subsystem ownership and frame flow, and [contributing](contributing.md) for checks, terminal verification, and documentation conventions. The organization draws on Textual, Ink, and Blessed; [the references and rationale](contributing.md#structure-inspiration) explain which patterns informed this wiki.
