import type { StyleSnapshot } from "./style";

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  style: StyleSnapshot;
  zIndex?: number;
  order?: number;
}

export interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Span {
  x: number;
  y: number;
  text: string;
  style: StyleSnapshot;
  zIndex?: number;
  order?: number;
}

export interface PaintResult {
  spans: Span[];
  rects: Rect[];
}
