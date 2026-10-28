import { content } from "./measure";

import type { Mounted } from "../runtime/tree";
import type { Style } from "../style/types";

const geometry: readonly (keyof Style)[] = [
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "grow",
  "shrink",
  "gap",
  "padding",
  "border",
  "borderTop",
  "borderRight",
  "borderBottom",
  "borderLeft",
  "justify",
  "align",
  "alignSelf",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "wrap",
  "maxLines",
  "overflow",
];
interface Snapshot {
  signature: string;
  children: readonly Mounted[];
}
export class LayoutInvalidation {
  private readonly previous = new WeakMap<Mounted, Snapshot>();
  changed(node: Mounted): boolean {
    const props = node.element.data.props;
    const signature = JSON.stringify([
      geometry.map((key) => node.style[key]),
      content(node),
      props.input?.placeholder,
      props.scroll,
      node.offset,
      node.offsetX,
    ]);
    const previous = this.previous.get(node);
    let changed =
      previous?.signature !== signature || previous.children.length !== node.children.length;
    if (!changed && previous)
      changed = node.children.some((child, index) => child !== previous.children[index]);
    this.previous.set(node, { signature, children: node.children.slice() });
    for (const child of node.children) changed = this.changed(child) || changed;
    return changed;
  }
}
