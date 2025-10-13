import { ReactiveEffect } from "./core";
import type { EffectHandle } from "./types";

export function effect(
  fn: () => void | (() => void),
): EffectHandle {
  if (typeof fn !== "function") {
    throw new TypeError("Effect function must be callable");
  }
  const handle = new ReactiveEffect(fn);
  handle.flush();
  return handle;
}
