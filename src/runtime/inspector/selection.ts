import type { KeyEvent, PointerEvent } from "../../element/events";
import type { Mounted } from "../components/tree";

import { hit } from "../input/focus";

export interface InspectorEntry {
  node: Mounted;
  depth: number;
  id: number;
}
export class DebugSelection {
  root?: Mounted;
  selected?: Mounted;
  hovered?: Mounted;
  picking = false;
  point = { x: 0, y: 0 };
  help?: { text: string; x: number; y: number };
  entries: InspectorEntry[] = [];
  readonly collapsed = new Set<Mounted>();
  private readonly ids = new WeakMap<Mounted, number>();
  private nextId = 0;
  constructor(private readonly changed: () => void) {}
  refresh(root: Mounted): void {
    this.root = root;
    if (!this.selected?.active) this.selected = undefined;
    if (!this.hovered?.active) this.hovered = undefined;
    for (const node of this.collapsed)
      if (!node.active) this.collapsed.delete(node);
    const entries = this.collect(root);
    if (
      entries.length !== this.entries.length ||
      entries.some(
        (entry, index) =>
          entry.node !== this.entries[index]?.node ||
          entry.depth !== this.entries[index]?.depth,
      )
    )
      this.entries = entries;
    if (this.picking) this.hovered = hit(root, this.point, root.layout.rect);
  }
  select(node: Mounted | undefined): void {
    this.selected = node;
    this.changed();
  }
  hover(node: Mounted | undefined): void {
    if (node === this.hovered) return;
    this.hovered = node;
    this.changed();
  }
  pick(event: PointerEvent): void {
    this.point = { x: event.x, y: event.y };
    this.hovered =
      this.root && hit(this.root, this.point, this.root.layout.rect);
    if (event.action === "press" && event.button === 0) {
      this.selected = this.hovered;
      this.picking = false;
      for (let parent = this.selected?.parent; parent; parent = parent.parent)
        this.collapsed.delete(parent);
    }
    this.changed();
  }
  toggle(node: Mounted): void {
    if (this.collapsed.has(node)) this.collapsed.delete(node);
    else this.collapsed.add(node);
    this.changed();
  }
  navigate(event: KeyEvent): void {
    const node = this.selected;
    if (!node || !["left", "right"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "left") {
      if (node.children.length && !this.collapsed.has(node)) this.toggle(node);
      else this.select(node.parent ?? node);
    } else if (this.collapsed.has(node)) this.toggle(node);
    else this.select(node.children[0] ?? node);
  }
  private collect(node: Mounted, depth = 0): InspectorEntry[] {
    const id = this.ids.get(node) ?? this.nextId++;
    this.ids.set(node, id);
    return [
      { node, depth, id },
      ...(this.collapsed.has(node)
        ? []
        : node.children.flatMap((child) => this.collect(child, depth + 1))),
    ];
  }
}
