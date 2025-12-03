import { state } from "../signals";
import { BaseNode } from "./node";
import { StackNodeBase } from "./stack";

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
import type { ContainerProps, ScrollableProps } from "./props";

type ScrollableContainerProps = ScrollableProps & ContainerProps;

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

export class ScrollableNode extends StackNodeBase<ScrollableContainerProps> {
  private contentSize: Size = { width: 0, height: 0 };
  private viewport: LayoutRect = { x: 0, y: 0, width: 0, height: 0 };
  private scrollOffsetX: Signal<number> = state(0);
  private scrollOffsetY: Signal<number> = state(0);
  private scrollSubscriptionX: (() => void) | null = null;
  private scrollSubscriptionY: (() => void) | null = null;
  private focused = false;

  constructor(child: Node) {
    super("Scrollable", [child], null);
    this.syncScrollProps();
  }

  override isFocusable(): boolean {
    return true;
  }

  override focus(): void {
    this.focused = true;
    super.focus();
  }

  override blur(): void {
    this.focused = false;
    super.blur();
  }

  handleKeyPress(
    key: string,
    ctrl: boolean,
    shift: boolean,
    alt: boolean,
  ): boolean {
    if (!this.focused) {
      return false;
    }

    const step = this.getScrollStep();
    const fastStep = step * 5; // Fast scroll when holding shift

    switch (key) {
      case "arrowup":
        this.scrollBy(0, shift ? -fastStep : -step);
        return true;
      case "arrowdown":
        this.scrollBy(0, shift ? fastStep : step);
        return true;
      case "arrowleft":
        this.scrollBy(shift ? -fastStep : -step, 0);
        return true;
      case "arrowright":
        this.scrollBy(shift ? fastStep : step, 0);
        return true;
      case "pageup":
        this.scrollBy(0, -Math.floor(this.viewport.height * 0.8));
        return true;
      case "pagedown":
        this.scrollBy(0, Math.floor(this.viewport.height * 0.8));
        return true;
      case "home":
        if (ctrl) {
          this.setScroll(0, 0);
        } else {
          this.setScroll(0, this.scrollOffsetY.get());
        }
        return true;
      case "end":
        if (ctrl) {
          this.setScroll(
            Math.max(this.contentSize.width - this.viewport.width, 0),
            Math.max(this.contentSize.height - this.viewport.height, 0),
          );
        } else {
          this.setScroll(
            Math.max(this.contentSize.width - this.viewport.width, 0),
            this.scrollOffsetY.get(),
          );
        }
        return true;
      default:
        return false;
    }
  }

  private get childNode(): Node {
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
    this.setScroll(
      this.scrollOffsetX.get() + dx,
      this.scrollOffsetY.get() + dy,
    );
  }

  setScroll(x: number, y: number): void {
    const clamped = this.clampScroll(x, y);
    const currentX = this.scrollOffsetX.get();
    const currentY = this.scrollOffsetY.get();
    const changed = clamped.x !== currentX || clamped.y !== currentY;
    if (!changed) {
      return;
    }

    // Set the new scroll offsets - signal changes will trigger re-render
    this.scrollOffsetX.set(clamped.x);
    this.scrollOffsetY.set(clamped.y);

    const handler = this.propsDefinition.onScroll;
    if (typeof handler === "function") {
      handler(clamped.x, clamped.y);
    }
  }

  private clampScroll(x: number, y: number): { x: number; y: number } {
    const maxX = Math.max(this.contentSize.width - this.viewport.width, 0);
    const maxY = Math.max(this.contentSize.height - this.viewport.height, 0);
    return {
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY)),
    };
  }

  private syncScrollProps(): void {
    if (this.scrollSubscriptionX) {
      this.scrollSubscriptionX();
    }
    if (this.scrollSubscriptionY) {
      this.scrollSubscriptionY();
    }

    if (this.propsDefinition.scrollX) {
      const signal = this.propsDefinition.scrollX;
      const clampedX = this.clampScroll(
        signal.get(),
        this.scrollOffsetY.get(),
      ).x;
      this.scrollOffsetX.set(clampedX);
      this.scrollSubscriptionX = signal.subscribe((value) => {
        const clampedValue = this.clampScroll(
          value,
          this.scrollOffsetY.get(),
        ).x;
        this.scrollOffsetX.set(clampedValue);
      });
    } else {
      this.scrollSubscriptionX = null;
    }

    if (this.propsDefinition.scrollY) {
      const signal = this.propsDefinition.scrollY;
      const clampedY = this.clampScroll(
        this.scrollOffsetX.get(),
        signal.get(),
      ).y;
      this.scrollOffsetY.set(clampedY);
      this.scrollSubscriptionY = signal.subscribe((value) => {
        const clampedValue = this.clampScroll(
          this.scrollOffsetX.get(),
          value,
        ).y;
        this.scrollOffsetY.set(clampedValue);
      });
    } else {
      this.scrollSubscriptionY = null;
    }
  }

  override props(map?: Partial<ScrollableContainerProps>): this {
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

  override _measure(constraints: Constraints, inherited: ResolvedStyle): Size {
    const size = super._measure(constraints, inherited);
    const style = this.getResolvedStyle();

    // Measure child with unrestricted constraints to determine content size
    const child = this.childNode;
    const unrestricted = {
      minWidth: 0,
      minHeight: 0,
      maxWidth: Infinity,
      maxHeight: Infinity,
    };

    // Create a modified inherited style that forces no size constraints
    // This ensures the child and its descendants can expand to natural size
    const unrestrictedInheritedStyle: ResolvedStyle = {
      ...style,
      width: "auto",
      height: "auto",
      minWidth: "none",
      minHeight: "none",
      maxWidth: "none",
      maxHeight: "none",
    };

    const childSize = child._measure(unrestricted, unrestrictedInheritedStyle);

    this.contentSize = {
      width: childSize.width,
      height: childSize.height,
    };

    return size;
  }

  override _layout(origin: Point, size: Size): void {
    super._layout(origin, size);

    const style = this.getResolvedStyle();
    const padding = style.padding;
    this.viewport = {
      x: origin.x + padding.left,
      y: origin.y + padding.top,
      width: Math.max(size.width - (padding.left + padding.right), 0),
      height: Math.max(size.height - (padding.top + padding.bottom), 0),
    };

    const child = this.childNode;

    // Measure child with unrestricted constraints to get its natural size
    const unrestricted = {
      minWidth: 0,
      minHeight: 0,
      maxWidth: Infinity,
      maxHeight: Infinity,
    };

    // Create unconstrained inherited style for content measurement
    const unrestrictedInheritedStyle: ResolvedStyle = {
      ...style,
      width: "auto",
      height: "auto",
      minWidth: "none",
      minHeight: "none",
      maxWidth: "none",
      maxHeight: "none",
    };

    const childSize = child._measure(unrestricted, unrestrictedInheritedStyle);

    // Use the child's natural size as content size
    this.contentSize = {
      width: childSize.width,
      height: childSize.height,
    };

    // Only clamp scroll offset if it's now invalid (content shrunk)
    const maxX = Math.max(this.contentSize.width - this.viewport.width, 0);
    const maxY = Math.max(this.contentSize.height - this.viewport.height, 0);

    // Only adjust scroll offset if it exceeds the new bounds
    if (this.scrollOffsetX.get() > maxX) {
      this.scrollOffsetX.set(maxX);
    }
    if (this.scrollOffsetY.get() > maxY) {
      this.scrollOffsetY.set(maxY);
    }

    // Position child based on scroll offset
    const childOrigin = {
      x: this.viewport.x - this.scrollOffsetX.get(),
      y: this.viewport.y - this.scrollOffsetY.get(),
    };

    child._layout(childOrigin, childSize);

    this.dirty = false;
  }

  override _paint(): PaintResult {
    const style = this.getResolvedStyle();
    const snapshot = this.getStyleSnapshot();
    const layout = this.getLayoutRect();

    // Subscribe to scroll offset signals to ensure re-renders on changes
    const scrollX = this.scrollOffsetX.get();
    const scrollY = this.scrollOffsetY.get();

    const childPaint = this.childNode._paint();

    const spans: PaintResult["spans"] = [];
    const rects: PaintResult["rects"] = [];

    if (style.background !== null) {
      rects.push({
        x: layout.x,
        y: layout.y,
        width: layout.width,
        height: layout.height,
        style: snapshot,
      });
    }

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

  isWheelScrollEnabled(): boolean {
    return this.isWheelEnabled();
  }

  isFocused(): boolean {
    return this.focused;
  }
}

export function Scrollable(child: Node): ScrollableNode {
  return new ScrollableNode(child);
}
