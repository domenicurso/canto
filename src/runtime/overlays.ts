import type { Mounted } from "./tree";

import { walk } from "./tree";

export function overlays(root: Mounted): Mounted[] {
  return walk(root)
    .filter((node) => node.active && node.element.data.props.overlay)
    .sort(
      (a, b) => (a.layout.style.zIndex ?? 0) - (b.layout.style.zIndex ?? 0),
    );
}
export function inside(node: Mounted | undefined, ancestor: Mounted): boolean {
  for (let current = node; current; current = current.parent ?? undefined)
    if (current === ancestor) return true;
  return false;
}
