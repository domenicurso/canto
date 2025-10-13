import { applyMinMax, clamp, resolveDimension } from "../layout";
import { isSignal } from "../signals";
import { BaseNode } from "./node";

import type { Constraints } from "../layout";
import type { Signal } from "../signals";
import type { ResolvedStyle } from "../style";
import type {
  LayoutRect,
  PaintResult,
  Point,
  Rect,
  Size,
  Span,
} from "../types";
import type { Node } from "./node";
import type { ScrollableProps } from "./props";

function intersectRect(a: LayoutRect, b: LayoutRect): LayoutRect | null {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  if (x2 <= x1 || y2 <= y1) {
    return null;
  }
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

function clipSpan(span: Span, viewport: LayoutRect): Span | null {
  if (span.y < viewport.y || span.y >= viewport.y + viewport.height) {
    return null;
  }
  const start = Math.max(span.x, viewport.x);
  const end = Math.min(span.x + span.text.length, viewport.x + viewport.width);
  if (end <= start) {
    return null;
  }
  const offsetStart = start - span.x;
  const offsetEnd = span.text.length - (span.x + span.text.length - end);
  const text = span.text.slice(offsetStart, offsetEnd);
  return {
    x: start,
    y: span.y,
    text,
    style: span.style,
  };
}

function clipRect(rect: Rect, viewport: LayoutRect): Rect | null {
  const intersection = intersectRect(rect, viewport);
  if (!intersection) {
    return null;
  }
  return {
    x: intersection.x,
    y: intersection.y,
    width: intersection.width,
    height: intersection.height,
    style: rect.style,
  };
}

export class ScrollableNode extends BaseNode<ScrollableProps> {
  private contentSize: Size = { width: 0, height: 0 };
  private viewport: LayoutRect = { x: 0, y: 0, width: 0, height: 0 };
  private scrollOffsetX = 0;
  private scrollOffsetY = 0;
  private scrollSubscriptionX: (() => void) | null = null;
  private scrollSubscriptionY: (() => void) | null = null;

  constructor(child: Node) {
    super("Scrollable", [child]);
  }

  private get child(): Node {
    const child = this.children[0];
    if (!child) {
      throw new Error("ScrollableNode requires exactly one child");
    }
    return child;
  }

  private getScrollStep(): number {
    return this.propsDefinition.scrollStep ?? 1;
  }

  getScrollStepValue(): number {
    return this.getScrollStep();
  }

  private isWheelEnabled(): boolean {
    const value = this.propsDefinition.scrollWheelEnabled;
    return value === undefined ? true : Boolean(value);
  }

  scrollBy(dx: number, dy: number): void {
    this.setScroll(this.scrollOffsetX + dx, this.scrollOffsetY + dy);
  }

  setScroll(x: number, y: number): void {
    const clamped = this.clampScroll(x, y);
    const changed =
      clamped.x !== this.scrollOffsetX || clamped.y !== this.scrollOffsetY;
    if (!changed) {
      return;
    }
    this.scrollOffsetX = clamped.x;
    this.scrollOffsetY = clamped.y;
    const handler = this.propsDefinition.onScroll;
    if (typeof handler === "function") {
      handler(this.scrollOffsetX, this.scrollOffsetY);
    }
    this._invalidate();
  }

  private clampScroll(x: number, y: number): { x: number; y: number } {
    const maxX = Math.max(this.contentSize.width - this.viewport.width, 0);
    const maxY = Math.max(this.contentSize.height - this.viewport.height, 0);
    return {
      x: clamp(x, 0, maxX),
      y: clamp(y, 0, maxY),
    };
  }

  private syncScrollProps(): void {
    if (this.scrollSubscriptionX) {
      this.scrollSubscriptionX();
    }
    if (this.scrollSubscriptionY) {
      this.scrollSubscriptionY();
    }

    if (isSignal(this.propsDefinition.scrollX)) {
      const signal = this.propsDefinition.scrollX as Signal<number>;
      this.scrollOffsetX = clamp(signal.get(), 0, Number.MAX_SAFE_INTEGER);
      this.scrollSubscriptionX = signal.subscribe((value) => {
        this.scrollOffsetX = value;
        this._invalidate();
      });
    } else {
      this.scrollSubscriptionX = null;
    }

    if (isSignal(this.propsDefinition.scrollY)) {
      const signal = this.propsDefinition.scrollY as Signal<number>;
      this.scrollOffsetY = clamp(signal.get(), 0, Number.MAX_SAFE_INTEGER);
      this.scrollSubscriptionY = signal.subscribe((value) => {
        this.scrollOffsetY = value;
        this._invalidate();
      });
    } else {
      this.scrollSubscriptionY = null;
    }
  }

  override props(map?: Partial<ScrollableProps>): this {
    super.props(map);
    this.syncScrollProps();
    return this;
  }

  override dispose(): void {
    super.dispose();
    if (this.scrollSubscriptionX) {
      this.scrollSubscriptionX();
      this.scrollSubscriptionX = null;
    }
    if (this.scrollSubscriptionY) {
      this.scrollSubscriptionY();
      this.scrollSubscriptionY = null;
    }
  }

  _measure(constraints: Constraints, inherited: ResolvedStyle): Size {
    const style = this.resolveCurrentStyle(inherited);
    const padding = style.padding;
    const innerConstraints: Constraints = {
      minWidth: 0,
      maxWidth: Math.max(
        constraints.maxWidth - (padding.left + padding.right),
        0,
      ),
      minHeight: 0,
      maxHeight: Math.max(
        constraints.maxHeight - (padding.top + padding.bottom),
        0,
      ),
    };

    this.contentSize = this.child._measure(innerConstraints, style);

    const intrinsicWidth =
      this.contentSize.width + padding.left + padding.right;
    const intrinsicHeight =
      this.contentSize.height + padding.top + padding.bottom;

    let width = resolveDimension(
      style.width,
      constraints.minWidth,
      constraints.maxWidth,
      intrinsicWidth,
    );
    width = applyMinMax(width, style.minWidth, style.maxWidth);
    width = clamp(width, constraints.minWidth, constraints.maxWidth);

    let height = resolveDimension(
      style.height,
      constraints.minHeight,
      constraints.maxHeight,
      intrinsicHeight,
    );
    height = applyMinMax(height, style.minHeight, style.maxHeight);
    height = clamp(height, constraints.minHeight, constraints.maxHeight);

    return { width, height };
  }

  _layout(origin: Point, size: Size): void {
    const style = this.getResolvedStyle();
    this.updateLayoutRect(origin, size);
    const padding = style.padding;

    this.viewport = {
      x: origin.x + padding.left,
      y: origin.y + padding.top,
      width: Math.max(size.width - (padding.left + padding.right), 0),
      height: Math.max(size.height - (padding.top + padding.bottom), 0),
    };

    const clamped = this.clampScroll(this.scrollOffsetX, this.scrollOffsetY);
    this.scrollOffsetX = clamped.x;
    this.scrollOffsetY = clamped.y;

    const childOrigin = {
      x: this.viewport.x - this.scrollOffsetX,
      y: this.viewport.y - this.scrollOffsetY,
    };

    this.child._layout(childOrigin, this.contentSize);
    this.dirty = false;
  }

  _paint(): PaintResult {
    const style = this.getResolvedStyle();
    const snapshot = this.getStyleSnapshot();
    const layout = this.getLayoutRect();
    const childPaint = this.child._paint();

    const spans: PaintResult["spans"] = [];
    const rects: PaintResult["rects"] = [
      {
        x: layout.x,
        y: layout.y,
        width: layout.width,
        height: layout.height,
        style: snapshot,
      },
    ];

    const viewportRect: LayoutRect = {
      x: this.viewport.x,
      y: this.viewport.y,
      width: this.viewport.width,
      height: this.viewport.height,
    };

    for (const span of childPaint.spans) {
      const clipped = clipSpan(span, viewportRect);
      if (clipped) {
        spans.push(clipped);
      }
    }

    for (const rect of childPaint.rects) {
      const clipped = clipRect(rect, viewportRect);
      if (clipped) {
        rects.push(clipped);
      }
    }

    return { spans, rects };
  }
}

export function Scrollable(child: Node): ScrollableNode {
  return new ScrollableNode(child);
}
