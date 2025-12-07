import { computed, effect, state } from "../signals";
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
  cellsWritten: number;
  cellsSkipped: number;
  renderTime: number;
  totalFrames: number;
  avgRenderTime: number;
  maxRenderTime: number;
  minRenderTime: number;
}

export interface DebugPanelProps extends ContainerProps {
  visible?: boolean | Signal<boolean>;
  updateInterval?: number; // How often to update metrics display (ms)
  fpsWindow?: number; // Number of frames to average FPS over
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

export class DebugPanelNode extends BaseNode<DebugPanelProps> {
  private isVisible: Signal<boolean>;
  private metrics: Signal<DebugMetrics>;
  private contentStack: Node | null = null;
  private frameTimestamps: number[] = [];
  private renderTimes: number[] = [];
  private frameCount: number = 0;
  private fpsWindow: number;
  private updateInterval: number;
  private lastUpdateTime: number = 0;

  constructor(props: DebugPanelProps = {}) {
    super("Stack", []);

    // Initialize signals
    this.isVisible =
      typeof props.visible === "object" && "get" in props.visible
        ? (props.visible as Signal<boolean>)
        : state(props.visible ?? false);

    this.metrics = state({
      fps: 0,
      cellsWritten: 0,
      cellsSkipped: 0,
      renderTime: 0,
      totalFrames: 0,
      avgRenderTime: 0,
      maxRenderTime: 0,
      minRenderTime: 0,
    });

    this.fpsWindow = props.fpsWindow ?? 60;
    this.updateInterval = props.updateInterval ?? 100; // Update display every 100ms
    this.propsDefinition = props;

    this.buildContent();

    // React to visibility changes only (not metrics to avoid infinite loop)
    effect(() => {
      this.isVisible.get();
      this.updateChildren();
      this._invalidate();
    });
  }

  private updateChildren(): void {
    if (!this.isVisible.get()) {
      this._children = [];
      this.contentStack = null;
    } else {
      this.buildContent();
    }
  }

  // Removed automatic update loop to prevent stack overflow

  private updateDisplayMetrics(): void {
    const current = this.metrics.get();

    // Calculate FPS from recent render times
    const fps = this.calculateFPS();

    // Calculate average render time
    const avgRenderTime =
      this.renderTimes.length > 0
        ? this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length
        : 0;

    // Calculate min/max render times
    const maxRenderTime =
      this.renderTimes.length > 0 ? Math.max(...this.renderTimes) : 0;
    const minRenderTime =
      this.renderTimes.length > 0 ? Math.min(...this.renderTimes) : 0;

    this.metrics.set({
      ...current,
      fps: Math.round(fps * 10) / 10, // Round to 1 decimal
      avgRenderTime: Math.round(avgRenderTime * 100) / 100, // Round to 2 decimals
      maxRenderTime: Math.round(maxRenderTime * 100) / 100,
      minRenderTime: Math.round(minRenderTime * 100) / 100,
    });
  }

  private calculateFPS(): number {
    // Simple FPS: clean up old timestamps and count what's left
    const now = performance.now();
    const oneSecondAgo = now - 1000;

    // Remove timestamps older than 1 second
    while (
      this.frameTimestamps.length > 0 &&
      this.frameTimestamps[0] < oneSecondAgo
    ) {
      this.frameTimestamps.shift();
    }

    // The number of timestamps in the last second = FPS
    return this.frameTimestamps.length;
  }

  private buildContent(): void {
    // Create metrics display with reactive computed text content
    const metricsDisplay = VStack(
      Text("Debug Panel").style({
        bold: true,
        foreground: "cyan",
        underline: true,
      }),
      Text(
        computed(() => {
          const m = this.metrics.get();
          return `FPS: ${m.fps}`;
        }),
      ).style({
        foreground: computed(() => {
          const m = this.metrics.get();
          return m.fps < 5 ? "red" : m.fps < 10 ? "yellow" : "green";
        }),
      }),
      Text(
        computed(() => {
          const m = this.metrics.get();
          return `Frames: ${m.totalFrames}`;
        }),
      ).style({
        foreground: "white",
      }),
      Text(
        computed(() => {
          const m = this.metrics.get();
          return `Cells: ${m.cellsWritten}w / ${m.cellsSkipped}s`;
        }),
      ).style({
        foreground: "blue",
      }),
      HStack(
        Text("Render:").style({ foreground: "white", shrink: 0 }),
        Text(
          computed(() => {
            const m = this.metrics.get();
            return `${m.renderTime.toFixed(2)}ms`;
          }),
        ).style({
          foreground: computed(() => {
            const m = this.metrics.get();
            return m.renderTime > 16 ? "red" : "green";
          }),
          grow: 1,
        }),
      ).style({ gap: 1, width: "100%" }),
      HStack(
        Text("Avg:").style({ foreground: "white", shrink: 0 }),
        Text(
          computed(() => {
            const m = this.metrics.get();
            return `${m.avgRenderTime.toFixed(2)}ms`;
          }),
        ).style({
          foreground: "brightBlack",
          grow: 1,
        }),
      ).style({ gap: 1, width: "100%" }),
      HStack(
        Text("Min:").style({ foreground: "white", shrink: 0 }),
        Text(
          computed(() => {
            const m = this.metrics.get();
            return `${m.minRenderTime.toFixed(2)}ms`;
          }),
        ).style({
          foreground: "green",
          grow: 1,
        }),
      ).style({ gap: 1, width: "100%" }),
      HStack(
        Text("Max:").style({ foreground: "white", shrink: 0 }),
        Text(
          computed(() => {
            const m = this.metrics.get();
            return `${m.maxRenderTime.toFixed(2)}ms`;
          }),
        ).style({
          foreground: "red",
          grow: 1,
        }),
      ).style({ gap: 1, width: "100%" }),
    ).style({
      gap: 0,
      width: "100%",
      padding: [0, 1],
    });

    this.contentStack = VStack(metricsDisplay).style({
      background: "#1a1a1a",
      foreground: "white",
      width: 24,
    });

    this._children = [this.contentStack];
  }

  updateRenderStats(stats: {
    cellsWritten: number;
    cellsSkipped: number;
    renderTime: number;
  }): void {
    const current = this.metrics.get();
    const now = performance.now();

    this.frameCount++;

    // Track frame timestamps for FPS calculation (don't limit by window)
    this.frameTimestamps.push(now);

    // Track render times for performance metrics
    this.renderTimes.push(stats.renderTime);
    if (this.renderTimes.length > this.fpsWindow) {
      this.renderTimes.shift();
    }

    // Update metrics
    this.metrics.set({
      ...current,
      cellsWritten: stats.cellsWritten,
      cellsSkipped: stats.cellsSkipped,
      renderTime: stats.renderTime,
      totalFrames: this.frameCount,
    });

    // Update display metrics only - don't trigger rebuild during render
    this.updateDisplayMetrics();
  }

  toggle(): void {
    const current = this.isVisible.get();
    this.isVisible.set(!current);
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
    this.frameCount = 0;
    this.frameTimestamps = [];
    this.renderTimes = [];
    this.metrics.set({
      fps: 0,
      cellsWritten: 0,
      cellsSkipped: 0,
      renderTime: 0,
      totalFrames: 0,
      avgRenderTime: 0,
      maxRenderTime: 0,
      minRenderTime: 0,
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
