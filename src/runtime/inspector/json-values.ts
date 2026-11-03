type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

class UnsupportedJSON extends Error {}

/** Editing must never evaluate getters, toJSON callbacks, or cyclic application state. */
export function jsonEditSource(value: unknown): string | undefined {
  try {
    return JSON.stringify(
      copyJSON(value, { seen: new Set(), remaining: 1000 }),
    );
  } catch (error) {
    if (!(error instanceof UnsupportedJSON)) throw error;
    return undefined;
  } // Unsupported values remain visible but read-only.
}
function copyJSON(
  value: unknown,
  state: { seen: Set<object>; remaining: number },
): JSONValue {
  const { seen } = state;
  if (--state.remaining < 0)
    throw new UnsupportedJSON("Value is too large to edit inline.");
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (!value || typeof value !== "object" || seen.has(value) || seen.size >= 20)
    throw new UnsupportedJSON("Not editable JSON.");
  if (
    !Array.isArray(value) &&
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  )
    throw new UnsupportedJSON("Not a JSON object.");
  if (
    Object.keys(value).length > 1000 ||
    (Array.isArray(value) && value.length > 1000)
  )
    throw new UnsupportedJSON("Value is too large to edit inline.");
  seen.add(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const entries = Object.entries(descriptors).filter(
    ([, field]) => field.enumerable,
  );
  if (entries.some(([, field]) => field.get || field.set))
    throw new UnsupportedJSON("Accessors are read-only.");
  const result = Array.isArray(value)
    ? Array.from({ length: value.length }, (_, index) => {
        const field = descriptors[String(index)];
        return field ? copyJSON(field.value, state) : null;
      })
    : Object.fromEntries(
        entries.map(([key, field]) => [key, copyJSON(field.value, state)]),
      );
  seen.delete(value);
  return result;
}
export function parseCompatibleJSON(source: string, current: unknown): unknown {
  const value: unknown = JSON.parse(source);
  if (
    current !== null &&
    (value === null ||
      typeof value !== typeof current ||
      Array.isArray(value) !== Array.isArray(current))
  )
    throw new Error("Keep the property's value type.");
  return value;
}
