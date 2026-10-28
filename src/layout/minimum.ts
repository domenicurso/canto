import type { Mounted } from "../runtime/tree";

import { flowGaps } from "./border-joining";
import { edges } from "./geometry";

/** Preserve content and box decoration before assigning flexible space. */
export function minimum(node: Mounted, horizontal: boolean): number {
  const style = node.style;
  const explicit = horizontal ? style.minWidth : style.minHeight;
  if (explicit !== undefined) return explicit;
  const [top, right, bottom, left] = edges(style);
  const decoration = horizontal ? left + right : top + bottom;
  const kind = node.element.data.kind;
  let content = ["text", "input", "textarea", "scroll"].includes(kind) ? 1 : 0;
  if (kind !== "scroll") {
    const children = node.children.filter(
      (child) => child.style.position !== "absolute",
    );
    const sizes = children.map((child) => minimum(child, horizontal));
    const sequence =
      kind !== "overlay" && (horizontal ? kind === "row" : kind !== "row");
    content = Math.max(
      content,
      sequence
        ? sizes.reduce(
            (sum, size) => sum + size,
            flowGaps(children, horizontal),
          )
        : Math.max(0, ...sizes),
    );
  }
  return Math.min(
    horizontal ? (style.maxWidth ?? Infinity) : (style.maxHeight ?? Infinity),
    decoration + content,
  );
}
