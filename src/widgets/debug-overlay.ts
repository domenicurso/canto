import { effect, state } from "../signals";
import { DebugPanel, DebugPanelNode } from "./debug-panel";
import { BaseNode } from "./node";
import { Stack, VStack } from "./stack";
import { resolveAxisSize } from "./style-utils";

import type { Constraints } from "../layout";
import type { Signal } from "../signals";
import type { ResolvedStyle } from "../style";
import type { PaintResult, Point, Size } from "../types";
import type { DebugMetrics } from "./debug-panel";
import type { Node } from "./node";
import type { ContainerProps } from "./props";

export interface DebugOverlayProps extends ContainerProps {
  content: Node;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  initialVisible?: boolean;
}

export class DebugOverlayNode extends BaseNode<DebugOverlayProps> {
  private debugPanel: DebugPanelNode;
  private isDebugVisible: Signal<boolean>;
  private contentNode: Node;

  constructor(props: DebugOverlayProps) {
    super("Stack", []);

    this.contentNode = props.content;
    this.isDebugVisible = state(props.initialVisible ?? false);

    // Set props
    this.propsDefinition = props;

    // Create the debug panel
    this.debugPanel = DebugPanel({
      visible: this.isDebugVisible,
      position: props.position ?? "bottom-right",
    });

    this.updateChildren();

    // Set up reactive updates
    effect(() => {
      // This effect will run whenever isDebugVisible changes
      this.isDebugVisible.get(); // Subscribe to changes
      this.updateChildren();
      this._invalidate();
    });
  }

  private updateChildren(): void {
    this._children = [this.buildLayeredTree()];
  }

  private buildLayeredTree(): Node {
    if (!this.isDebugVisible.get()) {
      return this.contentNode;
    }

    // Create a wrapper for the debug panel with proper positioning
    const debugWrapper = VStack(this.debugPanel).style({
      position: "absolute",
      right: 0,
      bottom: 0,
      zIndex: 1000,
    });

    return Stack(this.contentNode, debugWrapper).style({
      width: "100%",
      height: "100%",
    });
  }

  toggleDebug(): void {
    const current = this.isDebugVisible.get();
    this.isDebugVisible.set(!current);
  }

  showDebug(): void {
    this.isDebugVisible.set(true);
  }

  hideDebug(): void {
    this.isDebugVisible.set(false);
  }

  isVisible(): boolean {
    return this.isDebugVisible.get();
  }

  resetStats(): void {
    this.debugPanel.reset();
  }

  getMetrics(): DebugMetrics {
    return (this.debugPanel as any).metrics.get();
  }

  _measure(constraints: Constraints, inherited: ResolvedStyle): Size {
    const style = this.resolveCurrentStyle(inherited);
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

    const child = this._children[0];
    const childSize = child
      ? child._measure(innerConstraints, style)
      : { width: 0, height: 0 };

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

    const child = this._children[0];
    if (child) {
      const padding = style.padding;
      const childOrigin = {
        x: origin.x + padding.left,
        y: origin.y + padding.top,
      };
      const childSize = {
        width: Math.max(size.width - (padding.left + padding.right), 0),
        height: Math.max(size.height - (padding.top + padding.bottom), 0),
      };
      child._layout(childOrigin, childSize);
    }

    this.dirty = false;
  }

  _paint(): PaintResult {
    const child = this._children[0];
    const result = child ? child._paint() : { spans: [], rects: [] };
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

export function DebugOverlay(props: DebugOverlayProps): DebugOverlayNode {
  return new DebugOverlayNode(props);
}

// Convenience function to wrap any content with debug overlay
export function withDebug(
  content: Node,
  options: Omit<DebugOverlayProps, "content"> = {},
): DebugOverlayNode {
  return new DebugOverlayNode({
    content,
    ...options,
  });
}

// Global debug manager for easy access
export class GlobalDebugManager {
  private overlay: DebugOverlayNode | null = null;

  setOverlay(overlay: DebugOverlayNode): void {
    this.overlay = overlay;
  }

  toggle(): void {
    if (this.overlay) {
      this.overlay.toggleDebug();
    }
  }

  show(): void {
    if (this.overlay) {
      this.overlay.showDebug();
    }
  }

  hide(): void {
    if (this.overlay) {
      this.overlay.hideDebug();
    }
  }

  isVisible(): boolean {
    return this.overlay?.isVisible() ?? false;
  }

  reset(): void {
    if (this.overlay) {
      this.overlay.resetStats();
    }
  }

  getMetrics(): DebugMetrics | null {
    return this.overlay?.getMetrics() ?? null;
  }
}

// Export a global instance
export const Debug = new GlobalDebugManager();
