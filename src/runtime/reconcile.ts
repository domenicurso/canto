import type { Element } from "../element/node";
import type { AppControl } from "./hooks";
import type { Mounted } from "./tree";

import { flatten } from "../element/node";
import { cleanupHooks, enter } from "./hooks";
import { mounted } from "./tree";

export interface ReconcileContext {
  schedule(): void;
  app: AppControl;
}
function same(a: Element, b: Element): boolean {
  return (
    a.data.kind === b.data.kind &&
    a.data.call?.identity === b.data.call?.identity
  );
}
export function unmount(node: Mounted): void {
  if (!node.active) return;
  node.active = false;
  const errors: unknown[] = [];
  for (const child of node.children) {
    try {
      unmount(child);
    } catch (error) {
      errors.push(error);
    }
  }
  try {
    cleanupHooks(node);
  } catch (error) {
    errors.push(error);
  }
  try {
    node.element.data.props.ref?.(null);
  } catch (error) {
    errors.push(error);
  }
  if (errors.length)
    throw new AggregateError(errors, "Component cleanup failed.");
}
export function reconcile(
  node: Mounted,
  element: Element,
  context: ReconcileContext,
): void {
  const previous = node.element;
  node.element = element;
  const call = element.data.call;
  let descriptions: Element[];
  if (call) {
    if (!node.dirty && previous === element) {
      for (const child of node.children)
        reconcile(child, child.element, context);
      return;
    }
    node.dirty = false;
    const previousCount = node.hooks.length;
    descriptions = flatten([enter({ node, ...context }, call.render)]);
    if (node.rendered && node.hookIndex !== previousCount)
      throw new Error("Hook count changed between renders.");
    node.rendered = true;
  } else {
    descriptions = flatten(element.data.children);
  }
  reconcileChildren(node, descriptions, context);
}
function reconcileChildren(
  parent: Mounted,
  descriptions: Element[],
  context: ReconcileContext,
): void {
  const old = new Map<string, Mounted>();
  parent.children.forEach((node, index) =>
    old.set(identity(node.element, index), node),
  );
  const keys = new Set<string>();
  const next: Mounted[] = [];
  parent.children = next;
  try {
    for (const [index, element] of descriptions.entries()) {
      const key = identity(element, index);
      if (keys.has(key)) throw new Error(`Duplicate sibling key: ${key}`);
      keys.add(key);
      const existing = old.get(key);
      old.delete(key);
      const child =
        existing && same(existing.element, element)
          ? existing
          : mounted(element, parent);
      if (existing && child !== existing) unmount(existing);
      next.push(child);
      // Publish acquired children immediately so a render failure can still release them.
      reconcile(child, element, context);
    }
  } catch (error) {
    parent.children = [...next, ...old.values()];
    throw error;
  }
  for (const child of old.values()) unmount(child);
  parent.children = next;
}

function identity(element: Element, index: number): string {
  return element.data.key === undefined
    ? `index:${index}`
    : `key:${typeof element.data.key}:${element.data.key}`;
}
