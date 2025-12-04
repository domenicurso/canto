import { state } from "../signals";
import { BaseNode } from "./node";
import { StackNodeBase } from "./stack";

import type { Constraints } from "../layout";
import type { Signal } from "../signals";
import type { Color, ResolvedStyle } from "../style";
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
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragScrollbarType: "horizontal" | "vertical" | null = null;
  private initialScrollX = 0;
  private initialScrollY = 0;

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

  private isScrollbarEnabled(): boolean {
    const value = this.propsDefinition.scrollbarEnabled;
    return value === undefined ? false : Boolean(value);
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

    // First, calculate viewport dimensions without scrollbar adjustments to determine content size
    const baseViewportWidth = Math.max(
      size.width - (style.padding.left + style.padding.right),
      0,
    );
    const baseViewportHeight = Math.max(
      size.height - (style.padding.top + style.padding.bottom),
      0,
    );

    const child = this.childNode;

    // Measure child with base viewport constraints
    const viewportConstraints = {
      minWidth: 0,
      minHeight: 0,
      maxWidth: baseViewportWidth,
      maxHeight: baseViewportHeight,
    };

    const viewportSize = child._measure(viewportConstraints, style);

    // Measure with unrestricted constraints
    const unrestrictedConstraints = {
      minWidth: 0,
      minHeight: 0,
      maxWidth: Infinity,
      maxHeight: Infinity,
    };

    const unrestrictedSize = child._measure(unrestrictedConstraints, style);

    // Calculate initial content size
    const initialContentSize = {
      width: Math.max(viewportSize.width, unrestrictedSize.width),
      height: Math.max(viewportSize.height, unrestrictedSize.height),
    };

    // Determine which scrollbars are actually needed
    let scrollbarAdjustmentX = 0;
    let scrollbarAdjustmentY = 0;

    if (this.isScrollbarEnabled()) {
      const needsVerticalScrollbar =
        initialContentSize.height > baseViewportHeight;
      const needsHorizontalScrollbar =
        initialContentSize.width > baseViewportWidth;

      if (needsVerticalScrollbar) {
        scrollbarAdjustmentX = 1; // Width of vertical scrollbar
      }
      if (needsHorizontalScrollbar) {
        scrollbarAdjustmentY = 1; // Height of horizontal scrollbar
      }

      // Re-check if adding one scrollbar necessitates the other
      if (needsVerticalScrollbar && !needsHorizontalScrollbar) {
        const adjustedViewportWidth = baseViewportWidth - scrollbarAdjustmentX;
        if (initialContentSize.width > adjustedViewportWidth) {
          scrollbarAdjustmentY = 1; // Now need horizontal scrollbar too
        }
      }
      if (needsHorizontalScrollbar && !needsVerticalScrollbar) {
        const adjustedViewportHeight =
          baseViewportHeight - scrollbarAdjustmentY;
        if (initialContentSize.height > adjustedViewportHeight) {
          scrollbarAdjustmentX = 1; // Now need vertical scrollbar too
        }
      }
    }

    // Final viewport dimensions
    const finalViewportWidth = Math.max(
      baseViewportWidth - scrollbarAdjustmentX,
      0,
    );
    const finalViewportHeight = Math.max(
      baseViewportHeight - scrollbarAdjustmentY,
      0,
    );

    // Re-measure with final viewport if adjustments were made
    if (scrollbarAdjustmentX > 0 || scrollbarAdjustmentY > 0) {
      const finalViewportConstraints = {
        minWidth: 0,
        minHeight: 0,
        maxWidth: finalViewportWidth,
        maxHeight: finalViewportHeight,
      };

      const finalViewportSize = child._measure(finalViewportConstraints, style);

      this.contentSize = {
        width: Math.max(finalViewportSize.width, unrestrictedSize.width),
        height: Math.max(finalViewportSize.height, unrestrictedSize.height),
      };
    } else {
      this.contentSize = initialContentSize;
    }

    return size;
  }

  override _layout(origin: Point, size: Size): void {
    super._layout(origin, size);

    const style = this.getResolvedStyle();
    const padding = style.padding;

    // Calculate base viewport dimensions
    const baseViewportWidth = Math.max(
      size.width - (padding.left + padding.right),
      0,
    );
    const baseViewportHeight = Math.max(
      size.height - (padding.top + padding.bottom),
      0,
    );

    // Determine which scrollbars are actually needed
    let scrollbarAdjustmentX = 0;
    let scrollbarAdjustmentY = 0;

    if (this.isScrollbarEnabled()) {
      const needsVerticalScrollbar =
        this.contentSize.height > baseViewportHeight;
      const needsHorizontalScrollbar =
        this.contentSize.width > baseViewportWidth;

      if (needsVerticalScrollbar) {
        scrollbarAdjustmentX = 1; // Width of vertical scrollbar
      }
      if (needsHorizontalScrollbar) {
        scrollbarAdjustmentY = 1; // Height of horizontal scrollbar
      }

      // Re-check if adding one scrollbar necessitates the other
      if (needsVerticalScrollbar && !needsHorizontalScrollbar) {
        const adjustedViewportWidth = baseViewportWidth - scrollbarAdjustmentX;
        if (this.contentSize.width > adjustedViewportWidth) {
          scrollbarAdjustmentY = 1; // Now need horizontal scrollbar too
        }
      }
      if (needsHorizontalScrollbar && !needsVerticalScrollbar) {
        const adjustedViewportHeight =
          baseViewportHeight - scrollbarAdjustmentY;
        if (this.contentSize.height > adjustedViewportHeight) {
          scrollbarAdjustmentX = 1; // Now need vertical scrollbar too
        }
      }
    }

    this.viewport = {
      x: origin.x + padding.left,
      y: origin.y + padding.top,
      width: Math.max(baseViewportWidth - scrollbarAdjustmentX, 0),
      height: Math.max(baseViewportHeight - scrollbarAdjustmentY, 0),
    };

    const child = this.childNode;

    // First, measure child with viewport constraints for proper percentage width handling
    const viewportConstraints = {
      minWidth: 0,
      minHeight: 0,
      maxWidth: this.viewport.width,
      maxHeight: this.viewport.height,
    };

    const viewportSize = child._measure(viewportConstraints, style);

    // Then measure with unrestricted constraints to allow content to exceed viewport
    const unrestrictedConstraints = {
      minWidth: 0,
      minHeight: 0,
      maxWidth: Infinity,
      maxHeight: Infinity,
    };

    const unrestrictedSize = child._measure(unrestrictedConstraints, style);

    // Use the larger of viewport size or unrestricted size
    const childSize = {
      width: Math.max(viewportSize.width, unrestrictedSize.width),
      height: Math.max(viewportSize.height, unrestrictedSize.height),
    };

    this.contentSize = childSize;

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

    // Render scrollbars if enabled
    if (this.isScrollbarEnabled()) {
      this.renderScrollbars(spans, rects, style);
    }

    return { spans, rects };
  }

  isWheelScrollEnabled(): boolean {
    return this.isWheelEnabled();
  }

  isFocused(): boolean {
    return this.focused;
  }

  handleMouseEvent(event: {
    action: string;
    button?: string;
    x: number;
    y: number;
  }): boolean {
    if (!this.isScrollbarEnabled()) {
      return false;
    }

    switch (event.action) {
      case "press":
        return this.handleMousePress(event.x, event.y);
      case "release":
        return this.handleMouseRelease();
      case "move":
        return this.handleMouseMove(event.x, event.y);
      default:
        return false;
    }
  }

  private handleMousePress(x: number, y: number): boolean {
    const scrollbarType = this.getScrollbarAt(x, y);
    if (!scrollbarType) {
      return false;
    }

    // Check if clicking on track vs thumb
    const clickedOnThumb = this.isClickOnThumb(x, y, scrollbarType);

    if (clickedOnThumb) {
      // Start dragging the thumb
      this.isDragging = true;
      this.dragScrollbarType = scrollbarType;
      this.dragStartX = x;
      this.dragStartY = y;
      this.initialScrollX = this.scrollOffsetX.get();
      this.initialScrollY = this.scrollOffsetY.get();
    } else {
      // Jump to clicked position on track
      this.jumpToTrackPosition(x, y, scrollbarType);
    }

    return true;
  }

  private handleMouseRelease(): boolean {
    if (!this.isDragging) {
      return false;
    }

    this.isDragging = false;
    this.dragScrollbarType = null;
    return true;
  }

  private handleMouseMove(x: number, y: number): boolean {
    if (!this.isDragging || !this.dragScrollbarType) {
      return false;
    }

    const layout = this.getLayoutRect();
    const needsVerticalScrollbar =
      this.contentSize.height > this.viewport.height;
    const needsHorizontalScrollbar =
      this.contentSize.width > this.viewport.width;

    if (this.dragScrollbarType === "vertical") {
      const trackHeight = needsHorizontalScrollbar
        ? layout.height - 1
        : layout.height;
      const maxScrollY = Math.max(
        this.contentSize.height - this.viewport.height,
        0,
      );

      // Calculate thumb height
      const thumbHeight = Math.max(
        Math.floor(
          (this.viewport.height / this.contentSize.height) * trackHeight,
        ),
        1,
      );

      // Calculate usable track space (track minus thumb)
      const usableTrackHeight = trackHeight - thumbHeight;

      if (usableTrackHeight > 0) {
        const deltaY = y - this.dragStartY;
        const scrollRatio = deltaY / usableTrackHeight;
        const newScrollY = this.initialScrollY + scrollRatio * maxScrollY;
        this.setScroll(this.scrollOffsetX.get(), newScrollY);
      }
    } else if (this.dragScrollbarType === "horizontal") {
      const trackWidth = needsVerticalScrollbar
        ? layout.width - 1
        : layout.width;
      const maxScrollX = Math.max(
        this.contentSize.width - this.viewport.width,
        0,
      );

      // Calculate thumb width
      const thumbWidth = Math.max(
        Math.floor((this.viewport.width / this.contentSize.width) * trackWidth),
        1,
      );

      // Calculate usable track space (track minus thumb)
      const usableTrackWidth = trackWidth - thumbWidth;

      if (usableTrackWidth > 0) {
        const deltaX = x - this.dragStartX;
        const scrollRatio = deltaX / usableTrackWidth;
        const newScrollX = this.initialScrollX + scrollRatio * maxScrollX;
        this.setScroll(newScrollX, this.scrollOffsetY.get());
      }
    }

    return true;
  }

  private getScrollbarAt(
    x: number,
    y: number,
  ): "horizontal" | "vertical" | null {
    const layout = this.getLayoutRect();
    const scrollbarSize = 1;

    const needsVerticalScrollbar =
      this.contentSize.height > this.viewport.height;
    const needsHorizontalScrollbar =
      this.contentSize.width > this.viewport.width;

    // Check vertical scrollbar
    if (needsVerticalScrollbar) {
      const trackX = layout.x + layout.width - scrollbarSize;
      const trackY = layout.y;
      const trackHeight = needsHorizontalScrollbar
        ? layout.height - scrollbarSize
        : layout.height;

      if (
        x >= trackX &&
        x < trackX + scrollbarSize &&
        y >= trackY &&
        y < trackY + trackHeight
      ) {
        return "vertical";
      }
    }

    // Check horizontal scrollbar
    if (needsHorizontalScrollbar) {
      const trackX = layout.x;
      const trackY = layout.y + layout.height - scrollbarSize;
      const trackWidth = needsVerticalScrollbar
        ? layout.width - scrollbarSize
        : layout.width;

      if (
        x >= trackX &&
        x < trackX + trackWidth &&
        y >= trackY &&
        y < trackY + scrollbarSize
      ) {
        return "horizontal";
      }
    }

    return null;
  }

  private isClickOnThumb(
    x: number,
    y: number,
    scrollbarType: "horizontal" | "vertical",
  ): boolean {
    const layout = this.getLayoutRect();
    const scrollX = this.scrollOffsetX.get();
    const scrollY = this.scrollOffsetY.get();
    const needsVerticalScrollbar =
      this.contentSize.height > this.viewport.height;
    const needsHorizontalScrollbar =
      this.contentSize.width > this.viewport.width;

    if (scrollbarType === "vertical") {
      const trackY = layout.y;
      const trackHeight = needsHorizontalScrollbar
        ? layout.height - 1
        : layout.height;
      const maxScrollY = Math.max(
        this.contentSize.height - this.viewport.height,
        0,
      );
      const thumbHeight = Math.max(
        Math.floor(
          (this.viewport.height / this.contentSize.height) * trackHeight,
        ),
        1,
      );
      const thumbY =
        trackY +
        Math.floor((scrollY / maxScrollY) * (trackHeight - thumbHeight));

      return y >= thumbY && y < thumbY + thumbHeight;
    } else if (scrollbarType === "horizontal") {
      const trackX = layout.x;
      const trackWidth = needsVerticalScrollbar
        ? layout.width - 1
        : layout.width;
      const maxScrollX = Math.max(
        this.contentSize.width - this.viewport.width,
        0,
      );
      const thumbWidth = Math.max(
        Math.floor((this.viewport.width / this.contentSize.width) * trackWidth),
        1,
      );
      const thumbX =
        trackX + Math.floor((scrollX / maxScrollX) * (trackWidth - thumbWidth));

      return x >= thumbX && x < thumbX + thumbWidth;
    }

    return false;
  }

  private jumpToTrackPosition(
    x: number,
    y: number,
    scrollbarType: "horizontal" | "vertical",
  ): void {
    const layout = this.getLayoutRect();
    const needsVerticalScrollbar =
      this.contentSize.height > this.viewport.height;
    const needsHorizontalScrollbar =
      this.contentSize.width > this.viewport.width;

    if (scrollbarType === "vertical") {
      const trackY = layout.y;
      const trackHeight = needsHorizontalScrollbar
        ? layout.height - 1
        : layout.height;
      const maxScrollY = Math.max(
        this.contentSize.height - this.viewport.height,
        0,
      );
      const thumbHeight = Math.max(
        Math.floor(
          (this.viewport.height / this.contentSize.height) * trackHeight,
        ),
        1,
      );
      const usableTrackHeight = trackHeight - thumbHeight;

      if (usableTrackHeight > 0) {
        const relativeY = y - trackY;
        const targetThumbCenter = Math.max(
          0,
          Math.min(relativeY - thumbHeight / 2, usableTrackHeight),
        );
        const scrollRatio = targetThumbCenter / usableTrackHeight;
        const newScrollY = scrollRatio * maxScrollY;
        this.setScroll(this.scrollOffsetX.get(), newScrollY);
      }
    } else if (scrollbarType === "horizontal") {
      const trackX = layout.x;
      const trackWidth = needsVerticalScrollbar
        ? layout.width - 1
        : layout.width;
      const maxScrollX = Math.max(
        this.contentSize.width - this.viewport.width,
        0,
      );
      const thumbWidth = Math.max(
        Math.floor((this.viewport.width / this.contentSize.width) * trackWidth),
        1,
      );
      const usableTrackWidth = trackWidth - thumbWidth;

      if (usableTrackWidth > 0) {
        const relativeX = x - trackX;
        const targetThumbCenter = Math.max(
          0,
          Math.min(relativeX - thumbWidth / 2, usableTrackWidth),
        );
        const scrollRatio = targetThumbCenter / usableTrackWidth;
        const newScrollX = scrollRatio * maxScrollX;
        this.setScroll(newScrollX, this.scrollOffsetY.get());
      }
    }
  }

  private renderScrollbars(
    spans: PaintResult["spans"],
    rects: PaintResult["rects"],
    style: ResolvedStyle,
  ): void {
    const layout = this.getLayoutRect();
    const scrollX = this.scrollOffsetX.get();
    const scrollY = this.scrollOffsetY.get();

    // Calculate if scrollbars are needed
    const needsVerticalScrollbar =
      this.contentSize.height > this.viewport.height;
    const needsHorizontalScrollbar =
      this.contentSize.width > this.viewport.width;

    const scrollbarSize = 1; // Width/height of scrollbar
    const scrollbarBackground = style.scrollbarBackground || "black";
    const scrollbarForeground = style.scrollbarForeground || "brightBlack";

    // Render vertical scrollbar
    if (needsVerticalScrollbar) {
      const trackX = layout.x + layout.width - scrollbarSize;
      const trackY = layout.y;
      const trackHeight = needsHorizontalScrollbar
        ? layout.height - scrollbarSize
        : layout.height;

      // Scrollbar track
      rects.push({
        x: trackX,
        y: trackY,
        width: scrollbarSize,
        height: trackHeight,
        style: {
          foreground: null,
          background: scrollbarBackground,
          bold: false,
          italic: false,
          underline: false,
          faint: false,
        },
      });

      // Render precise vertical thumb using Unicode blocks
      this.renderVerticalThumb(
        spans,
        trackX,
        trackY,
        trackHeight,
        scrollY,
        scrollbarForeground,
      );
    }

    // Render horizontal scrollbar
    if (needsHorizontalScrollbar) {
      const trackX = layout.x;
      const trackY = layout.y + layout.height - scrollbarSize;
      const trackWidth = needsVerticalScrollbar
        ? layout.width - scrollbarSize
        : layout.width;

      // Scrollbar track
      rects.push({
        x: trackX,
        y: trackY,
        width: trackWidth,
        height: scrollbarSize,
        style: {
          foreground: null,
          background: scrollbarBackground,
          bold: false,
          italic: false,
          underline: false,
          faint: false,
        },
      });

      // Render precise horizontal thumb using Unicode blocks
      this.renderHorizontalThumb(
        spans,
        trackX,
        trackY,
        trackWidth,
        scrollX,
        scrollbarForeground,
      );
    }

    // Fill intersection corner if both scrollbars are present
    if (needsVerticalScrollbar && needsHorizontalScrollbar) {
      spans.push({
        x: layout.x + layout.width - 1,
        y: layout.y + layout.height - 1,
        text: " ",
        style: {
          foreground: null,
          background: scrollbarBackground,
          bold: false,
          italic: false,
          underline: false,
          faint: false,
        },
      });
    }
  }

  private renderVerticalThumb(
    spans: PaintResult["spans"],
    trackX: number,
    trackY: number,
    trackHeight: number,
    scrollY: number,
    foregroundColor: Color | null,
  ): void {
    const maxScrollY = Math.max(
      this.contentSize.height - this.viewport.height,
      0,
    );

    // Calculate precise thumb position and size
    const thumbRatio = this.viewport.height / this.contentSize.height;
    const thumbSize = Math.max(thumbRatio * trackHeight, 0.5); // Minimum half character
    const thumbPosition = (scrollY / maxScrollY) * (trackHeight - thumbSize);

    // Unicode block characters for vertical precision (height fractions)
    const vBlocks = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

    // Calculate which characters to render
    const startPos = thumbPosition;
    const endPos = thumbPosition + thumbSize;
    const startChar = Math.floor(startPos);
    const endChar = Math.floor(endPos);

    for (let y = startChar; y <= endChar && y < trackHeight; y++) {
      const charStart = Math.max(startPos - y, 0);
      const charEnd = Math.min(endPos - y, 1);
      const charFill = charEnd - charStart;

      if (charFill > 0) {
        const style = this.getResolvedStyle();
        const trackColor = style.scrollbarBackground || "black";
        const thumbColor = foregroundColor || "brightBlack";

        // For vertical blocks, determine if we're filling from bottom (natural) or top (inverted)
        let blockChar: string;
        let fg: Color | null;
        let bg: Color | null;

        if (charStart === 0) {
          // Thumb starts at top of character cell - need to fill from top down
          // Since Unicode blocks fill bottom-up, we need inverted colors
          if (charFill >= 1.0) {
            // Full block case
            blockChar = "█";
            fg = thumbColor;
            bg = trackColor;
          } else {
            // Partial block from top - use inverted colors
            const blockIndex = Math.max(
              0,
              Math.min(Math.floor(charFill * 8), 7),
            );
            blockChar = vBlocks[7 - blockIndex] || "█";
            fg = trackColor;
            bg = thumbColor;
          }
        } else if (charEnd === 1) {
          // Thumb ends at bottom of character cell - can fill bottom up naturally
          if (charFill >= 1.0) {
            // Full block case
            blockChar = "█";
            fg = thumbColor;
            bg = trackColor;
          } else {
            const fillAmount = charFill;
            const blockIndex = Math.max(
              0,
              Math.min(Math.floor(fillAmount * 8), 7),
            );
            blockChar = vBlocks[blockIndex] || "█";
            fg = thumbColor;
            bg = trackColor;
          }
        } else {
          // Full block in middle
          blockChar = "█";
          fg = thumbColor;
          bg = trackColor;
        }

        spans.push({
          x: trackX,
          y: trackY + y,
          text: blockChar,
          style: {
            foreground: fg,
            background: bg,
            bold: false,
            italic: false,
            underline: false,
            faint: false,
          },
        });
      }
    }
  }

  private renderHorizontalThumb(
    spans: PaintResult["spans"],
    trackX: number,
    trackY: number,
    trackWidth: number,
    scrollX: number,
    foregroundColor: Color | null,
  ): void {
    const maxScrollX = Math.max(
      this.contentSize.width - this.viewport.width,
      0,
    );

    // Calculate precise thumb position and size
    const thumbRatio = this.viewport.width / this.contentSize.width;
    const thumbSize = Math.max(thumbRatio * trackWidth, 0.5); // Minimum half character
    const thumbPosition = (scrollX / maxScrollX) * (trackWidth - thumbSize);

    // Unicode block characters for horizontal precision (width fractions)
    const hBlocks = ["▏", "▎", "▍", "▌", "▋", "▊", "▉", "█"];

    // Calculate which characters to render
    const startPos = thumbPosition;
    const endPos = thumbPosition + thumbSize;
    const startChar = Math.floor(startPos);
    const endChar = Math.floor(endPos);

    for (let x = startChar; x <= endChar && x < trackWidth; x++) {
      const charStart = Math.max(startPos - x, 0);
      const charEnd = Math.min(endPos - x, 1);
      const charFill = charEnd - charStart;

      if (charFill > 0) {
        const style = this.getResolvedStyle();
        const trackColor = style.scrollbarBackground || "black";
        const thumbColor = foregroundColor || "brightBlack";

        // For horizontal blocks, determine if we're filling from left (natural) or right (inverted)
        let blockChar: string;
        let fg: Color | null;
        let bg: Color | null;

        if (charStart === 0) {
          // Fill from left to right (natural direction for horizontal blocks)
          if (charFill >= 1.0) {
            // Full block case
            blockChar = "█";
            fg = thumbColor;
            bg = trackColor;
          } else {
            const blockIndex = Math.max(
              0,
              Math.min(Math.floor(charFill * 8), 7),
            );
            blockChar = hBlocks[blockIndex] || "█";
            fg = thumbColor;
            bg = trackColor;
          }
        } else if (charEnd === 1) {
          // Fill from right to left (need to invert colors)
          if (charFill >= 1.0) {
            // Full block case
            blockChar = "█";
            fg = thumbColor;
            bg = trackColor;
          } else {
            const fillFromRight = charFill;
            const blockIndex = Math.max(
              0,
              Math.min(Math.floor(fillFromRight * 8), 7),
            );
            blockChar = hBlocks[7 - blockIndex] || "█";
            fg = trackColor;
            bg = thumbColor;
          }
        } else {
          // Full block
          blockChar = "█";
          fg = thumbColor;
          bg = trackColor;
        }

        spans.push({
          x: trackX + x,
          y: trackY,
          text: blockChar,
          style: {
            foreground: fg,
            background: bg,
            bold: false,
            italic: false,
            underline: false,
            faint: false,
          },
        });
      }
    }
  }
}

export function Scrollable(child: Node): ScrollableNode {
  return new ScrollableNode(child);
}
