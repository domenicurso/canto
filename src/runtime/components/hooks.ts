import type { Clipboard } from "../../terminal/clipboard";
import type { DebugControl } from "../inspector/chrome";
import type { SelectionControl } from "../selection/selection-mode";
import type { Mounted } from "./tree";

import { guard } from "./error-boundary";
import { hookRuntime } from "./hook-scope";
import { markDirty } from "./tree";

export type DependencyList = readonly unknown[];
export type Hook = StateHook | EffectHook | MemoHook;
interface StateHook {
  kind: "state";
  value: unknown;
  setter?: unknown;
}
interface EffectHook {
  kind: "effect";
  dependencies?: DependencyList;
  cleanup?: () => void;
  run?: () => void | (() => void);
}
interface MemoHook {
  kind: "memo";
  value: unknown;
  dependencies: DependencyList;
}
export interface AppControl {
  stop(): void;
  readonly clipboard: Clipboard;
  readonly debug: DebugControl;
  readonly selection: SelectionControl;
  readonly viewport: { width: number; height: number };
}
export interface HookScope {
  node: Mounted;
  schedule(): void;
  app: AppControl;
}
export function enter<T>(scope: HookScope, render: () => T): T {
  const previous = hookRuntime.current;
  hookRuntime.current = scope;
  scope.node.component.hookIndex = 0;
  try {
    return render();
  } finally {
    hookRuntime.current = previous;
  }
}
function scope(): HookScope {
  if (!hookRuntime.current)
    throw new Error("Hooks must be called inside a mounted component.");
  return hookRuntime.current;
}
function next(kind: Hook["kind"]): {
  context: HookScope;
  index: number;
  previous: Hook | undefined;
} {
  const context = scope();
  const index = context.node.component.hookIndex++;
  const previous = context.node.component.hooks[index];
  if (previous && previous.kind !== kind)
    throw context.node.component.refreshing
      ? hookRuntime.mismatch
      : new Error("Hook order changed between renders.");
  return { context, index, previous };
}
export function useState<T>(
  initial: T | (() => T),
): readonly [T, (value: T | ((previous: T) => T)) => void] {
  const { context, index, previous } = next("state");
  const hook: StateHook =
    previous?.kind === "state"
      ? previous
      : {
          kind: "state",
          value:
            typeof initial === "function" ? (initial as () => T)() : initial,
        };
  context.node.component.hooks[index] = hook;
  // Stable hook ordering guarantees this slot contains this call's T on subsequent renders.
  const read = (): T => hook.value as T;
  const set = (value: T | ((previous: T) => T)): void => {
    if (!context.node.active || context.node.component.hooks[index] !== hook)
      return;
    if (hookRuntime.current)
      throw new Error(
        "State cannot be updated during rendering. Update it in an event or effect.",
      );
    const updated =
      typeof value === "function"
        ? (value as (previous: T) => T)(read())
        : value;
    if (Object.is(updated, hook.value)) return;
    hook.value = updated;
    markDirty(context.node);
    context.schedule();
  };
  hook.setter ??= set;
  // The stable setter belongs to the same typed state slot as its value.
  return [read(), hook.setter as typeof set];
}
function equal(
  a: DependencyList | undefined,
  b: DependencyList | undefined,
): boolean {
  return (
    a !== undefined &&
    b !== undefined &&
    a.length === b.length &&
    a.every((value, index) => Object.is(value, b[index]))
  );
}
export function useEffect(
  run: () => void | (() => void),
  dependencies?: DependencyList,
): void {
  const { context, index, previous } = next("effect");
  if (
    !context.node.component.refreshing &&
    previous?.kind === "effect" &&
    equal(previous.dependencies, dependencies)
  )
    return;
  context.node.component.hooks[index] = {
    kind: "effect",
    dependencies: dependencies?.slice(),
    cleanup: previous?.kind === "effect" ? previous.cleanup : undefined,
    run,
  };
}
export function useMemo<T>(
  calculate: () => T,
  dependencies: DependencyList,
): T {
  const { context, index, previous } = next("memo");
  if (
    !context.node.component.refreshing &&
    previous?.kind === "memo" &&
    equal(previous.dependencies, dependencies)
  ) {
    // Hook ordering preserves the value type associated with this memo slot.
    return previous.value as T;
  }
  const value = calculate();
  context.node.component.hooks[index] = {
    kind: "memo",
    value,
    dependencies: dependencies.slice(),
  };
  return value;
}
export function useRef<T>(initial: T): { current: T } {
  return useState(() => ({ current: initial }))[0];
}
export function useViewport(): Readonly<{ width: number; height: number }> {
  return scope().app.viewport;
}
export function useApp(): AppControl {
  return scope().app;
}
export function commitEffects(node: Mounted): void {
  for (const hook of node.component.hooks) {
    if (hook.kind !== "effect" || !hook.run) continue;
    if (
      !guard(node, () => {
        const run = hook.run;
        hook.run = undefined;
        const cleanup = hook.cleanup;
        hook.cleanup = undefined;
        cleanup?.();
        const result = run?.();
        if (typeof result === "function") hook.cleanup = result;
      })
    )
      return;
  }
  for (const child of node.children) commitEffects(child);
}
export function cleanupHooks(node: Mounted): void {
  const errors: unknown[] = [];
  for (const hook of node.component.hooks) {
    if (hook.kind !== "effect") continue;
    const cleanup = hook.cleanup;
    hook.cleanup = undefined;
    hook.run = undefined;
    try {
      cleanup?.();
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length) throw new AggregateError(errors, "Effect cleanup failed.");
}
