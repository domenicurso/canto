import type { Element } from "../../element/node";
import type { LayoutState } from "../../layout/geometry";
import type { ScrollState } from "../../layout/scrolling/scroll-state";
import type { EditorState } from "../editor/navigation";
import type { Hook } from "./hooks";

export interface Mounted {
  element: Element;
  parent: Mounted | null;
  children: Mounted[];
  active: boolean;
  readonly component: {
    hooks: Hook[];
    hookIndex: number;
    dirty: boolean;
    descendantsDirty: boolean;
    rendered: boolean;
  };
  readonly layout: LayoutState;
  readonly editor: EditorState;
  readonly scrolling: ScrollState;
  readonly interaction: {
    focused: boolean;
    hovered: boolean;
    pressed: boolean;
  };
}
export function mounted(element: Element, parent: Mounted | null): Mounted {
  return {
    element,
    parent,
    children: [],
    active: true,
    component: {
      hooks: [],
      hookIndex: 0,
      dirty: true,
      descendantsDirty: true,
      rendered: false,
    },
    layout: {
      rect: { x: 0, y: 0, width: 0, height: 0 },
      inner: { x: 0, y: 0, width: 0, height: 0 },
      style: {},
      lines: [],
    },
    editor: {
      value:
        element.data.props.input?.value ??
        element.data.props.input?.defaultValue ??
        "",
      cursor: 0,
      anchor: null,
      multiline: element.data.kind === "textarea",
    },
    scrolling: {
      offset: 0,
      maxOffset: 0,
      offsetX: 0,
      maxOffsetX: 0,
      scrollPlacement: { x: 0, y: 0 },
      initialized: false,
    },
    interaction: { focused: false, hovered: false, pressed: false },
  };
}
export function walk(root: Mounted): Mounted[] {
  return [root, ...root.children.flatMap(walk)];
}
export function markDirty(node: Mounted): void {
  node.component.dirty = true;
  for (let parent = node.parent; parent; parent = parent.parent)
    parent.component.descendantsDirty = true;
}
