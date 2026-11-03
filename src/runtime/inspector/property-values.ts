import type { PropertyLine } from "./properties";

import { jsonEditSource } from "./json-values";

export function properties(
  value: object,
  edit?: (key: string) => string | undefined,
): PropertyLine[] {
  return inspectableEntries(value)
    .filter(([, item]) => item !== undefined)
    .map(([label, item, readable]) => {
      const source = edit && readable ? jsonEditSource(item) : undefined;
      return {
        label,
        value: displayValue(item),
        edit: source === undefined ? undefined : edit?.(label),
        source,
      };
    });
}

/** Bound depth and collection size so application state cannot flood the inspector. */
export function displayValue(value: unknown, depth = 0): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "function")
    return `[callback${value.name ? ` ${value.name}` : ""}]`;
  if (value === null || typeof value !== "object") return String(value);
  if (value instanceof Uint8Array || value instanceof Uint8ClampedArray)
    return `[${value.byteLength} bytes]`;
  if (depth >= 2)
    return Array.isArray(value) ? `[${value.length} items]` : "{…}";
  if (Array.isArray(value))
    return `[${value
      .slice(0, 6)
      .map((item: unknown) => displayValue(item, depth + 1))
      .join(", ")}${value.length > 6 ? ", …" : ""}]`;
  const entries = inspectableEntries(value);
  return `{${entries
    .slice(0, 6)
    .map(([key, item]) => `${key}: ${displayValue(item, depth + 1)}`)
    .join(", ")}${entries.length > 6 ? ", …" : ""}}`;
}

function inspectableEntries(value: object): [string, unknown, boolean][] {
  // Inspecting state must not execute application getters or their side effects.
  return Object.entries(Object.getOwnPropertyDescriptors(value))
    .filter(([, descriptor]) => descriptor.enumerable)
    .map(([key, descriptor]) => [
      key,
      descriptor.get || descriptor.set ? "[accessor]" : descriptor.value,
      !descriptor.get && !descriptor.set,
    ]);
}
