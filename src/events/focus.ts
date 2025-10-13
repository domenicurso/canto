import type { Node } from "../widgets";
import { BaseNode } from "../widgets";

export function collectFocusableNodes(root: Node): BaseNode[] {
  const result: BaseNode[] = [];
  traverse(root, result);
  return result;
}

function traverse(node: Node, acc: BaseNode[]): void {
  if (node instanceof BaseNode) {
    if (node.isFocusable()) {
      acc.push(node);
    }
    for (const child of node.children) {
      traverse(child, acc);
    }
  }
}

export function findNodeById(root: Node, id: string): BaseNode | null {
  if (root instanceof BaseNode) {
    if (root.id === id) {
      return root;
    }
    for (const child of root.children) {
      const found = findNodeById(child, id);
      if (found) {
        return found;
      }
    }
  }
  return null;
}
