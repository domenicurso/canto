import type { Mounted } from "../components/tree";

interface Segment {
  key?: string | number;
  index: number;
  kind: string;
  name?: string;
}
export function selectionPath(node: Mounted): Segment[] {
  const path: Segment[] = [];
  for (
    let current: Mounted | null = node;
    current?.parent;
    current = current.parent
  ) {
    path.unshift({
      key: current.element.data.key,
      index: current.parent.children.indexOf(current),
      kind: current.element.data.kind,
      name: current.element.data.call?.name,
    });
  }
  return path;
}
export function resolveSelection(
  root: Mounted,
  path: Segment[],
): Mounted | undefined {
  let current = root;
  for (const segment of path) {
    const next =
      segment.key === undefined
        ? current.children[segment.index]
        : current.children.find(
            (node) => node.element.data.key === segment.key,
          );
    if (
      !next ||
      next.element.data.kind !== segment.kind ||
      next.element.data.call?.name !== segment.name
    )
      return undefined;
    current = next;
  }
  return current;
}
