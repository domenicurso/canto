import type { KeyPressEvent } from "./types";

export function isActivationKey(event: KeyPressEvent): boolean {
  return event.key === "enter" || event.key === "space";
}

export function isNavigationKey(event: KeyPressEvent): boolean {
  const navigation = new Set([
    "tab",
    "arrowup",
    "arrowdown",
    "arrowleft",
    "arrowright",
  ]);
  return navigation.has(event.key.toLowerCase());
}
