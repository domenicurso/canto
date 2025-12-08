import { computed, state } from "../signals";
import { BaseNode } from "./node";
import { HStack, VStack } from "./stack";
import { resolveAxisSize } from "./style-utils";
import { Text } from "./text";

import type { Constraints } from "../layout";
import type { Signal } from "../signals";
import type { ResolvedStyle } from "../style";
import type { PaintResult, Point, Size } from "../types";
import type { Node } from "./node";
import type { ContainerProps } from "./props";

export interface DebugMetrics {
  fps: number;
  avgFps: number;
  frameTime: number;
  avgFrameTime: number;
  frameCount: number;
  overallTime: number;
  avgOverallTime: number;
  renderTime: number;
  avgRenderTime: number;
  stdoutTime: number;
  avgStdoutTime: number;
  cellsWritten: number;
  avgCellsWritten: number;
  cellsSkipped: number;
  avgCellsSkipped: number;
}

export interface DebugPanelProps extends ContainerProps {
  visible?: boolean | Signal<boolean>;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

export class DebugPanelNode extends BaseNode<DebugPanelProps> {
  private isVisible: Signal<boolean>;
  private metrics: Signal<DebugMetrics>;
  private contentStack: Node | null = null;
  private frameTimestamps: number[] = [];
  private frameTimes: number[] = [];
  private renderTimes: number[] = [];
  private cellsWrittenHistory: number[] = [];
  private cellsSkippedHistory: number[] = [];
  private lastRenderStart: number = 0;
  private isRendering: boolean = false;
  private pendingUpdate: boolean = false;

  constructor(props: DebugPanelProps = {}) {
    super("Stack", []);

    this.isVisible =
      typeof props.visible === "object" && "get" in props.visible
        ? (props.visible as Signal<boolean>)
        : state(props.visible ?? false);

    this.metrics = state({
      fps: 0,
      avgFps: 0,
      frameTime: 0,
      avgFrameTime: 0,
      frameCount: 0,
      overallTime: 0,
      avgOverallTime: 0,
      renderTime: 0,
      avgRenderTime: 0,
      stdoutTime: 0,
      avgStdoutTime: 0,
      cellsWritten: 0,
      avgCellsWritten: 0,
      cellsSkipped: 0,
      avgCellsSkipped: 0,
    });

    this.propsDefinition = props;
    this.buildContent();

    // React to visibility changes
    if (typeof props.visible === "object" && "get" in props.visible) {
      this.styleSubscriptions.push(
        this.isVisible.subscribe(() => {
          this.updateChildren();
          this._invalidate();
        }),
      );
    }
  }

  private updateChildren(): void {
    // Prevent updates during rendering to avoid infinite recursion
    if (this.isRendering) {
      return;
    }

    if (!this.isVisible.get()) {
      this._children = [];
      this.contentStack = null;
    } else {
      this.buildContent();
    }
  }

  private buildContent(): void {
    if (!this.isVisible.get() || this.isRendering) return;

    // Get current metrics once to avoid reactivity during render
    const m = this.metrics.get();

    const metricsDisplay = HStack(
      // Labels column
      VStack(
        Text("Debug Info").style({ bold: true, italic: true }), // Header spacer
        Text("Frames drawn").style({ faint: true }),
        Text("Frames per second").style({ faint: true }),
        Text("Frame interval").style({ faint: true }),
        Text("Overal frame time").style({ faint: true }),
        Text("Render time").style({ faint: true }),
        Text("Stdout time").style({ faint: true }),
        Text("Cells drawn").style({ faint: true }),
      ).style({
        width: 20,
        shrink: 0,
        gap: 0,
      }),

      // Current values column
      VStack(
        Text("Current").style({ faint: true, bold: true }),
        Text(`${m.frameCount}`),
        Text(`${m.fps.toFixed(1)}`),
        Text(`${m.frameTime.toFixed(1)}ms`),
        Text(`${m.overallTime.toFixed(2)}ms`),
        Text(`${m.renderTime.toFixed(2)}ms`),
        Text(`${m.stdoutTime.toFixed(2)}ms`),
        Text(`${m.cellsWritten}w/${m.cellsSkipped}s`),
      ).style({
        width: 12,
        shrink: 0,
        gap: 0,
      }),

      // Average values column
      VStack(
        Text("Average").style({ faint: true, bold: true }),
        Text("-").style({ faint: true }),
        Text(`${m.avgFps.toFixed(1)}`),
        Text(`${m.avgFrameTime.toFixed(1)}ms`),
        Text(`${m.avgOverallTime.toFixed(2)}ms`),
        Text(`${m.avgRenderTime.toFixed(2)}ms`),
        Text(`${m.avgStdoutTime.toFixed(2)}ms`),
        Text(
          `${Math.round(m.avgCellsWritten)}w/${Math.round(m.avgCellsSkipped)}s`,
        ),
      ).style({
        width: 12,
        shrink: 0,
        gap: 0,
      }),
    ).style({
      width: "hug",
      gap: 1,
      padding: [0, 1],
    });

    this.contentStack = VStack(metricsDisplay).style({
      background: "#222222",
      foreground: "white",
      width: "hug",
    });

    this._children = [this.contentStack];
  }

  /**
   * Called by Surface before each render starts
   */
  onRenderStart(): void {
    this.isRendering = true;
    this.lastRenderStart = performance.now();
  }

  /**
   * Called by Surface after each render completes with the render stats
   */
  onRenderComplete(stats: {
    cellsWritten: number;
    cellsSkipped: number;
    renderTime: number;
  }): void {
    this.isRendering = false;

    // Defer metrics update to avoid recursion during paint
    if (!this.pendingUpdate) {
      this.pendingUpdate = true;
      setTimeout(() => {
        this.updateMetrics(stats);
        this.pendingUpdate = false;
        // Rebuild content with new metrics
        if (this.isVisible.get()) {
          this.buildContent();
          this._invalidate();
        }
      }, 0);
    }
  }

  private updateMetrics(stats: {
    cellsWritten: number;
    cellsSkipped: number;
    renderTime: number;
  }): void {
    const now = performance.now();
    const current = this.metrics.get();

    // Calculate total frame time (from start to completion)
    const totalFrameTime = now - this.lastRenderStart;

    // Track metrics
    this.frameTimestamps.push(now);
    this.frameTimes.push(totalFrameTime);
    this.renderTimes.push(stats.renderTime);
    this.cellsWrittenHistory.push(stats.cellsWritten);
    this.cellsSkippedHistory.push(stats.cellsSkipped);

    // Keep only last 60 measurements for rolling averages
    if (this.frameTimestamps.length > 60) {
      this.frameTimestamps.shift();
      this.frameTimes.shift();
      this.renderTimes.shift();
      this.cellsWrittenHistory.shift();
      this.cellsSkippedHistory.shift();
    }

    // Current frame metrics
    const currentFps = this.calculateCurrentFPS();
    const currentFrameTime =
      this.frameTimestamps.length > 1
        ? this.frameTimestamps[this.frameTimestamps.length - 1]! -
          this.frameTimestamps[this.frameTimestamps.length - 2]!
        : 0;
    const currentStdoutTime = Math.max(0, totalFrameTime - stats.renderTime);

    // Calculate rolling averages
    const avgFps = this.calculateAverageFPS();
    const avgFrameTime = this.calculateAverageFrameInterval();
    const avgOverallTime =
      this.frameTimes.length > 0
        ? this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
        : 0;
    const avgRenderTime =
      this.renderTimes.length > 0
        ? this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length
        : 0;
    const avgStdoutTime = Math.max(0, avgOverallTime - avgRenderTime);
    const avgCellsWritten =
      this.cellsWrittenHistory.length > 0
        ? this.cellsWrittenHistory.reduce((a, b) => a + b, 0) /
          this.cellsWrittenHistory.length
        : 0;
    const avgCellsSkipped =
      this.cellsSkippedHistory.length > 0
        ? this.cellsSkippedHistory.reduce((a, b) => a + b, 0) /
          this.cellsSkippedHistory.length
        : 0;

    this.metrics.set({
      fps: currentFps,
      avgFps,
      frameTime: currentFrameTime,
      avgFrameTime,
      frameCount: current.frameCount + 1,
      overallTime: totalFrameTime,
      avgOverallTime,
      renderTime: stats.renderTime,
      avgRenderTime,
      stdoutTime: currentStdoutTime,
      avgStdoutTime,
      cellsWritten: stats.cellsWritten,
      avgCellsWritten,
      cellsSkipped: stats.cellsSkipped,
      avgCellsSkipped,
    });
  }

  private calculateCurrentFPS(): number {
    if (this.frameTimestamps.length < 2) return 0;

    // Calculate FPS based on last few frame intervals for more stable current reading
    const intervals: number[] = [];
    const count = Math.min(10, this.frameTimestamps.length - 1); // Last 10 intervals

    for (
      let i = this.frameTimestamps.length - count;
      i < this.frameTimestamps.length;
      i++
    ) {
      if (i > 0) {
        const interval =
          this.frameTimestamps[i]! - this.frameTimestamps[i - 1]!;
        intervals.push(interval);
      }
    }

    if (intervals.length === 0) return 0;

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    return avgInterval > 0 ? 1000 / avgInterval : 0;
  }

  private calculateAverageFPS(): number {
    if (this.frameTimestamps.length < 2) return 0;

    // Calculate average FPS over all recorded intervals
    const avgInterval = this.calculateAverageFrameInterval();
    return avgInterval > 0 ? 1000 / avgInterval : 0;
  }

  private calculateAverageFrameInterval(): number {
    if (this.frameTimestamps.length < 2) return 0;

    // Calculate average time between frames
    const intervals: number[] = [];
    for (let i = 1; i < this.frameTimestamps.length; i++) {
      const interval = this.frameTimestamps[i]! - this.frameTimestamps[i - 1]!;
      intervals.push(interval);
    }

    if (intervals.length === 0) return 0;

    return intervals.reduce((a, b) => a + b, 0) / intervals.length;
  }

  toggle(): void {
    this.isVisible.set(!this.isVisible.get());
  }

  show(): void {
    this.isVisible.set(true);
  }

  hide(): void {
    this.isVisible.set(false);
  }

  isDebugVisible(): boolean {
    return this.isVisible.get();
  }

  reset(): void {
    this.frameTimestamps = [];
    this.frameTimes = [];
    this.renderTimes = [];
    this.cellsWrittenHistory = [];
    this.cellsSkippedHistory = [];
    this.metrics.set({
      fps: 0,
      avgFps: 0,
      frameTime: 0,
      avgFrameTime: 0,
      frameCount: 0,
      overallTime: 0,
      avgOverallTime: 0,
      renderTime: 0,
      avgRenderTime: 0,
      stdoutTime: 0,
      avgStdoutTime: 0,
      cellsWritten: 0,
      avgCellsWritten: 0,
      cellsSkipped: 0,
      avgCellsSkipped: 0,
    });
  }

  _measure(constraints: Constraints, inherited: ResolvedStyle): Size {
    const style = this.resolveCurrentStyle(inherited);
    if (!this.isVisible.get()) {
      return { width: 0, height: 0 };
    }

    const padding = style.padding;
    const horizontalPadding = padding.left + padding.right;
    const verticalPadding = padding.top + padding.bottom;

    const innerConstraints: Constraints = {
      minWidth: Math.max(0, constraints.minWidth - horizontalPadding),
      maxWidth: Number.isFinite(constraints.maxWidth)
        ? Math.max(0, constraints.maxWidth - horizontalPadding)
        : constraints.maxWidth,
      minHeight: Math.max(0, constraints.minHeight - verticalPadding),
      maxHeight: Number.isFinite(constraints.maxHeight)
        ? Math.max(0, constraints.maxHeight - verticalPadding)
        : constraints.maxHeight,
    };

    let childSize: Size = { width: 0, height: 0 };
    if (this.contentStack) {
      childSize = this.contentStack._measure(innerConstraints, style);
    }

    const intrinsicWidth = childSize.width + horizontalPadding;
    const intrinsicHeight = childSize.height + verticalPadding;

    const width = resolveAxisSize(
      style.width,
      style.minWidth,
      style.maxWidth,
      intrinsicWidth,
      constraints.minWidth,
      constraints.maxWidth,
    );

    const height = resolveAxisSize(
      style.height,
      style.minHeight,
      style.maxHeight,
      intrinsicHeight,
      constraints.minHeight,
      constraints.maxHeight,
    );

    return { width, height };
  }

  _layout(origin: Point, size: Size): void {
    const style = this.getResolvedStyle();
    this.updateLayoutRect(origin, size);

    if (!this.isVisible.get()) {
      this.dirty = false;
      return;
    }

    if (this.contentStack) {
      const padding = style.padding;
      const childOrigin = {
        x: origin.x + padding.left,
        y: origin.y + padding.top,
      };
      const childSize = {
        width: Math.max(size.width - (padding.left + padding.right), 0),
        height: Math.max(size.height - (padding.top + padding.bottom), 0),
      };
      this.contentStack._layout(childOrigin, childSize);
    }

    this.dirty = false;
  }

  _paint(): PaintResult {
    if (!this.isVisible.get()) {
      return { spans: [], rects: [] };
    }

    const result = this.paintChildren();
    const style = this.getResolvedStyle();
    if (style.background !== null) {
      const layout = this.getLayoutRect();
      result.rects.unshift({
        x: layout.x,
        y: layout.y,
        width: layout.width,
        height: layout.height,
        style: this.getStyleSnapshot(),
      });
    }
    return result;
  }
}

export function DebugPanel(props: DebugPanelProps = {}): DebugPanelNode {
  return new DebugPanelNode(props);
}
