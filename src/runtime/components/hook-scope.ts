import type { HookScope } from "./hooks";

const scopeKey = Symbol.for("canto.hook-scope.v2");
interface HookRuntime {
  current?: HookScope;
  readonly mismatch: Error;
}
// Only Canto owns this symbol. Bun's soft reload re-evaluates modules but retains globals.
const globals = globalThis as typeof globalThis & { [scopeKey]?: HookRuntime };
export const hookRuntime: HookRuntime = (globals[scopeKey] ??= {
  mismatch: new Error("Hook signature changed during hot reload."),
});
