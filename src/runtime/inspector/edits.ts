import type { Style } from "../../style/types";
import type { Mounted } from "../components/tree";

import { Element } from "../../element/node";
import { walk } from "../components/tree";
import { parseStyleEdit } from "./edit-values";

interface Override {
  style: Style;
  text?: string;
  original?: Element;
  applied?: Element;
}
const overrides = new WeakMap<Mounted, Override>();

export function editProperty(node: Mounted, key: string, source: string): void {
  const current = overrides.get(node) ?? { style: {} };
  if (key === "text") {
    const value: unknown = JSON.parse(source);
    if (typeof value !== "string")
      throw new Error("Text must be a JSON string.");
    current.text = value;
  } else current.style = { ...current.style, ...parseStyleEdit(key, source) };
  if (current.applied === node.element && current.original)
    node.element = current.original;
  current.applied = undefined;
  overrides.set(node, current);
}

export function resetProperties(node: Mounted): void {
  const current = overrides.get(node);
  if (current?.applied === node.element && current.original)
    node.element = current.original;
  overrides.delete(node);
}

export function hasEdits(node: Mounted): boolean {
  return overrides.has(node);
}

export function applyInspectorEdits(root: Mounted): void {
  for (const node of walk(root)) {
    const current = overrides.get(node);
    if (!current || current.applied === node.element) continue;
    current.original = node.element;
    node.element = new Element(
      {
        ...node.element.data,
        ...(current.text === undefined
          ? {}
          : { text: current.text, runs: undefined }),
      },
      {
        ...node.element.definition,
        base: { ...node.element.definition.base, ...current.style },
      },
    );
    current.applied = node.element;
  }
}
