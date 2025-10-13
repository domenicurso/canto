import { ComputedSignalImpl } from "./core";
import type { ComputedSignal } from "./types";

export function computed<T>(fn: () => T): ComputedSignal<T> {
  if (typeof fn !== "function") {
    throw new TypeError("Computed function must be callable");
  }
  return new ComputedSignalImpl(fn);
}
