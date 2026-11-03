import type { Mounted } from "../components/tree";
import type { DescriptionPatch } from "./description-edit";
import type { StateEdit } from "./state-edit";

import { Element } from "../../element/node";
import { markDirty } from "../components/tree";
import { descriptionEdit } from "./description-edit";
import { editState } from "./state-edit";

interface Overrides {
  original: Element;
  applied?: Element;
  descriptions: Map<string, DescriptionPatch>;
  state: Map<string, StateEdit>;
}
const overrides = new WeakMap<Mounted, Overrides>();

export function editProperty(node: Mounted, key: string, source: string): void {
  const current: Overrides = overrides.get(node) ?? {
    original: node.element,
    descriptions: new Map(),
    state: new Map(),
  };
  if (key.startsWith("state.")) {
    const state = editState(node, key, source);
    if (!current.state.has(key)) current.state.set(key, state);
  } else current.descriptions.set(key, descriptionEdit(node, key, source));
  overrides.set(node, current);
  node.descriptionOverride = (element) => describe(current, element);
  current.applied = undefined;
  node.element = describe(current, current.original);
  if (node.element.data.call) markDirty(node);
}
function describe(current: Overrides, element: Element): Element {
  if (element === current.applied) return element;
  if (element === current.original && current.applied) return current.applied;
  current.original = element;
  for (const patch of current.descriptions.values()) element = patch(element);
  current.applied = element;
  return element;
}
export function resetProperties(node: Mounted, key?: string): void {
  const current = overrides.get(node);
  if (!current) return;
  if (key !== undefined) {
    current.state.get(key)?.restore();
    current.state.delete(key);
    current.descriptions.delete(key);
  } else {
    for (const state of current.state.values()) state.restore();
    current.state.clear();
    current.descriptions.clear();
  }
  current.applied = undefined;
  node.element = describe(current, current.original);
  if (!current.state.size && !current.descriptions.size) {
    overrides.delete(node);
    node.descriptionOverride = undefined;
  }
  if (node.element.data.call) markDirty(node);
}
export function hasEdits(node: Mounted, key?: string): boolean {
  const current = overrides.get(node);
  return key === undefined
    ? Boolean(current)
    : Boolean(current?.descriptions.has(key) || current?.state.has(key));
}
