import type { Element } from "../element/node";
import type { Style } from "../style/types";
import type { Hook } from "./hooks";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Mounted {
  element: Element;
  parent: Mounted | null;
  children: Mounted[];
  hooks: Hook[];
  hookIndex: number;
  dirty: boolean;
  active: boolean;
  rect: Rect;
  inner: Rect;
  style: Style;
  lines: string[];
  value: string;
  cursor: number;
  anchor: number | null;
  rendered: boolean;
  offset: number;
  maxOffset: number;
  offsetX: number;
  maxOffsetX: number;
  focused: boolean;
  hovered: boolean;
  pressed: boolean;
}
export function mounted(element: Element, parent: Mounted | null): Mounted {
  return {
    element,
    parent,
    children: [],
    hooks: [],
    hookIndex: 0,
    dirty: true,
    active: true,
    rect: { x: 0, y: 0, width: 0, height: 0 },
    inner: { x: 0, y: 0, width: 0, height: 0 },
    style: {},
    lines: [],
    value: element.data.props.input?.value ?? element.data.props.input?.defaultValue ?? "",
    cursor: 0,
    anchor: null,
    rendered: false,
    offset: 0,
    maxOffset: 0,
    offsetX: 0,
    maxOffsetX: 0,
    focused: false,
    hovered: false,
    pressed: false,
  };
}
export function walk(root: Mounted): Mounted[] {
  return [root, ...root.children.flatMap(walk)];
}
