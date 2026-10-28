import type { Mounted } from "../runtime/tree";
import type { Style } from "../style/types";

import { width } from "../text/columns";
import { wrap } from "../text/wrap";
import { invalidateLayout } from "./arrange";
import { content } from "./measure";

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
  content: string;
}
export class LayoutInvalidation {
  private readonly previous = new WeakMap<Mounted, Snapshot>();
  changed(node: Mounted): boolean {
    const props = node.element.data.props;
    const signature = JSON.stringify([
      geometry.map((key) => node.style[key]),
      props.input?.placeholder,
      [props.scroll?.axis, props.scroll?.scrollbar, props.scroll?.gutter],
    ]);
    const previous = this.previous.get(node);
    let changed =
      previous?.signature !== signature ||
      previous.children.length !== node.children.length;
    if (!changed && previous)
      changed = node.children.some(
        (child, index) => child !== previous.children[index],
      );
    const value = content(node) || props.input?.placeholder || "";
    if (previous && previous.content !== value) {
      invalidateLayout(node);
      const before = textGeometry(previous.content, node);
      const after = textGeometry(value, node);
      changed ||= before !== after;
    }
    this.previous.set(node, {
      signature,
      children: node.children.slice(),
      content: value,
    });
    for (const child of node.children) changed = this.changed(child) || changed;
    if (changed) invalidateLayout(node);
    return changed;
  }
}

function textGeometry(value: string, node: Mounted): string {
  const style =
    node.element.data.kind === "input"
      ? { ...node.style, wrap: "none" as const }
      : node.style;
  const lines = wrap(value, node.inner.width, style);
  // Equal-sized replacements can repaint without moving any siblings.
  node.lines = lines;
  const natural =
    node.style.width === undefined || node.style.width === "content"
      ? Math.max(0, ...value.split("\n").map(width))
      : 0;
  return `${natural}:${Number(Boolean(value))}:${lines.length}:${Math.max(0, ...lines.map(width))}`;
}
