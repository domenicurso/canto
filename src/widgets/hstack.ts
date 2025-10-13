import {
  alignOffset,
  applyMinMax,
  clamp,
  computeStackWidth,
  resolveDimension,
} from "../layout";
import { BaseNode } from "./node";

import type { Constraints } from "../layout";
import type { ResolvedStyle } from "../style";
import type { PaintResult, Point, Size } from "../types";
import type { Node } from "./node";
import type { ContainerProps } from "./props";

export class HStackNode extends BaseNode<ContainerProps> {
  private measuredChildren: Size[] = [];

  constructor(children: Node[]) {
    super("HStack", children);
  }

  _measure(constraints: Constraints, inherited: ResolvedStyle): Size {
    const style = this.resolveCurrentStyle(inherited);
    const padding = style.padding;
    const availableWidth = Math.max(
      constraints.maxWidth - (padding.left + padding.right),
      0,
    );
    const availableHeight = Math.max(
      constraints.maxHeight - (padding.top + padding.bottom),
      0,
    );

    const childConstraints: Constraints = {
      minWidth: 0,
      maxWidth: availableWidth,
      minHeight: 0,
      maxHeight: availableHeight,
    };

    this.measuredChildren = this.children.map((child) =>
      child._measure(childConstraints, style),
    );

    const contentWidth = computeStackWidth(this.measuredChildren, style.gap);
    const contentHeight = this.measuredChildren.reduce(
      (max, child) => Math.max(max, child.height),
      0,
    );

    const intrinsicWidth = contentWidth + padding.left + padding.right;
    const intrinsicHeight = contentHeight + padding.top + padding.bottom;

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
    const innerWidth = Math.max(size.width - (padding.left + padding.right), 0);
    const innerHeight = Math.max(
      size.height - (padding.top + padding.bottom),
      0,
    );
    const totalContentWidth = computeStackWidth(
      this.measuredChildren,
      style.gap,
    );
    const offsetX = alignOffset(innerWidth, totalContentWidth, style.xAlign);

    let cursorX = origin.x + padding.left + offsetX;
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      const measured = this.measuredChildren[i];
      if (!child || !measured) {
        continue;
      }
      const childWidth = Math.min(measured.width, innerWidth);
      const childHeight = Math.min(measured.height, innerHeight);
      const offsetY = alignOffset(innerHeight, childHeight, style.yAlign);
      const childOrigin = {
        x: cursorX,
        y: origin.y + padding.top + offsetY,
      };
      child._layout(childOrigin, {
        width: childWidth,
        height: childHeight,
      });
      cursorX += childWidth + style.gap;
    }
    this.dirty = false;
  }

  _paint(): PaintResult {
    const result = this.paintChildren();
    const style = this.getResolvedStyle();
    const snapshot = this.getStyleSnapshot();
    if (style.background !== null) {
      const layout = this.getLayoutRect();
      result.rects.unshift({
        x: layout.x,
        y: layout.y,
        width: layout.width,
        height: layout.height,
        style: snapshot,
      });
    }
    return result;
  }
}

export function HStack(...children: Node[]): HStackNode {
  return new HStackNode(children);
}
