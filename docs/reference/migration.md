# Migrating from v1

[Documentation](../README.md) · [Examples](../examples.md)

V2 is a breaking rewrite. The v1 renderer, signal runtime, widgets, and examples were replaced; the current entry point exports the function-based API documented here. There is no compatibility layer in the current package.

| Concern                     | V2 approach                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| Session ownership           | `createApp(View, options)` followed by `await app.run()`; stop through app controls              |
| Composition                 | `text`, `row`, `column`, `box`, `button`, `input`, `textarea`, `scroll`, `overlay`, and `canvas` |
| Local reactive state        | `useState` inside the root or a `component()` callback                                           |
| Subscriptions and timers    | `useEffect` with explicit dependencies and cleanup                                               |
| Reusable appearance         | Immutable `style()` builders and `.use()`                                                        |
| Dynamic identity            | Component factory identity and stable sibling `.key()` values                                    |
| Console or compound widgets | Explicit composition of elements; see the rebuilt examples                                       |
| Tests                       | An injected `MemoryTerminal` and structured input events                                         |

Use the [side-by-side counter comparison](../../examples/v1/comparison.html) for an illustrative before/after, and [`examples/counter.ts`](../../examples/counter.ts) for runnable v2 code. [`examples/v1/`](../../examples/v1/) contains twelve demos rebuilt on v2; its name records their origin, not the API they run against.

Port one complete screen first: identify its state owners, move external resources into effects, express its layout with cells and fill dimensions, and test interactions using `MemoryTerminal`. Read [component identity](../guides/components.md) and the [layout contract](layout.md) before carrying over assumptions about mounting or sizing.
