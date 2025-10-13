import { StateSignal } from "./core";
import type { Signal } from "./types";

export function state<T>(initialValue: T): Signal<T> {
  return new StateSignal(initialValue);
}
