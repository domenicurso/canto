# Hooks

[API index](README.md) · [Source](../../src/runtime/hooks.ts) · [Component guide](../guides/components.md)

Call hooks inside the root render or a mounted `component()` callback. Keep calls in the same order on every render, outside loops and conditionals. A plain helper shares its caller's hook scope; it doesn't create an independent state boundary.

## useState

```ts
useState<T>(initial: T | (() => T)):
  readonly [T, (value: T | ((previous: T) => T)) => void]
```

Lazy initialization runs when the slot mounts. The setter has stable identity, supports functional updates, skips `Object.is`-equal values, and coalesces writes into scheduled frames. Updates during rendering throw; updates after unmount are ignored. Remounting starts from the initial value.

Replace changed objects or arrays so equality checks observe updates. If `T` itself is a function, wrap initialization and updates in callbacks returning that function.

## useEffect

```ts
useEffect(run: () => void | (() => void), dependencies?: readonly unknown[]): void
```

Effects run after successful output and ref attachment. Omitting dependencies runs after each rendered commit; `[]` runs on mount. Entries compare with `Object.is`. Cleanup runs before replacement and on unmount.

Return synchronously with an optional cleanup function. Launch async work inside the callback and handle rejection there; use cancellation for stale work. An effect callback cannot return a promise.

```ts
import { text, useEffect, useState } from "canto";

export function Clock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return text(time.toLocaleTimeString());
}
```

## useMemo

```ts
useMemo<T>(calculate: () => T, dependencies: readonly unknown[]): T
```

Calculates during render and reuses its result while dependencies remain `Object.is`-equal. Keep calculation free of side effects and include every changing value it reads. Memoization doesn't subscribe to external mutable data.

## useRef

```ts
useRef<T>(initial: T): { current: T }
```

Returns the same mutable object for the mounted slot's lifetime. Assigning `.current` doesn't schedule a frame. Use `useRef<ElementRef | null>(null)` with an element's `.ref()` callback; detach sends `null`.

## useViewport

```ts
useViewport(): Readonly<{ width: number; height: number }>
```

Reads viewport dimensions in terminal cells. Resize renders with new dimensions. This describes the application viewport rather than a component's own rectangle.

## useApp

```ts
useApp(): {
  stop(): void;
  readonly clipboard: Clipboard;
  readonly debug: DebugControl;
  readonly selection: SelectionControl;
  readonly viewport: { width: number; height: number };
}
```

Provides session controls inside a component. It doesn't expose `App.run`, `flush`, `schedule`, `stats`, or `status`; retain the outer `App` when an integration needs those. The internal name `AppControl` isn't a package export.
