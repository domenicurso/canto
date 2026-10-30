import type { Child } from "../element/node";
import type { Mounted } from "./tree";

import { fallbackContent } from "../element/error-boundary";
import { markDirty } from "./tree";

interface Failure {
  error: unknown;
  pending: boolean;
}
const failures = new WeakMap<Mounted, Failure>();
const schedules = new WeakMap<Mounted, () => void>();

export function boundaryContent(
  node: Mounted,
  render: () => Child,
  lifecycle: {
    schedule(): void;
    release(): void;
  },
): Child {
  const boundary = node.element.data.props.errorBoundary;
  if (!boundary) return render();
  schedules.set(node, lifecycle.schedule);
  const failure = failures.get(node);
  if (!failure) return render();
  if (failure.pending) {
    failure.pending = false;
    lifecycle.release();
  }
  return fallbackContent({
    render: boundary.fallback,
    error: failure.error,
    reset: () => {
      if (!node.active || failures.get(node) !== failure) return;
      failures.delete(node);
      markDirty(node);
      lifecycle.schedule();
    },
  });
}

export function captureOwnBoundary(node: Mounted, error: unknown): boolean {
  const schedule = schedules.get(node);
  if (
    !node.active ||
    !node.element.data.props.errorBoundary ||
    failures.has(node) ||
    !schedule
  )
    return false;
  failures.set(node, { error, pending: true });
  markDirty(node);
  schedule();
  return true;
}

export function captureBoundary(node: Mounted, error: unknown): boolean {
  for (let current: Mounted | null = node; current; current = current.parent)
    if (captureOwnBoundary(current, error)) return true;
  return false;
}

export function boundaryPending(node: Mounted): boolean {
  for (let current: Mounted | null = node; current; current = current.parent)
    if (failures.get(current)?.pending) return true;
  return false;
}

/** Callback failures belong to the boundary enclosing the callback's owning node. */
export function guard(node: Mounted, action: () => void): boolean {
  if (boundaryPending(node)) return false;
  try {
    action();
    return true;
  } catch (error) {
    if (!captureBoundary(node, error)) throw error;
    return false;
  }
}
