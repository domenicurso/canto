import { alignOffset } from "../layout";
import { wrapText } from "../layout/textwrap";
import { BaseNode } from "./node";
import {
  horizontalAlignFromDistribute,
  normalizeCrossAlign,
  resolveAxisSize,
} from "./style-utils";

import type { Constraints } from "../layout";
import type { Signal } from "../signals";
import type { CrossAlignment, ResolvedStyle } from "../style";
import type { PaintResult, Point, Size } from "../types";
import type { Node } from "./node";
import type { TextProps } from "./props";

export class TextNode extends BaseNode<TextProps> {
  private literalContent: string;
  private lines: string[] = [];

  constructor(content?: string | Signal<string>) {
    super("Text", []);
    this.literalContent = typeof content === "string" ? content : "";
    if (content && typeof content !== "string") {
      this.bind(content);
    }
  }

  private resolveContent(): string {
    const propContent = this.propsDefinition.content;
    if (propContent && typeof propContent !== "string") {
      if (propContent && "get" in propContent) {
        return propContent.get();
      }
    } else if (typeof propContent === "string") {
      return propContent;
    }
    if (this.binding) {
      return this.binding.get();
    }
    return this.literalContent;
  }

  _measure(constraints: Constraints, inherited: ResolvedStyle): Size {
    const style = this.resolveCurrentStyle(inherited);
    const padding = style.padding;
    const horizontalPadding = padding.left + padding.right;
    const verticalPadding = padding.top + padding.bottom;

    const content = this.resolveContent();

    // Calculate the target width for wrapping by considering all constraints
    let targetContentWidth: number | undefined;

    // Start with container constraints
    let maxWidth = constraints.maxWidth;

    // Apply style maxWidth constraint
    if (style.maxWidth !== "none" && typeof style.maxWidth === "number") {
      maxWidth = Math.min(maxWidth, style.maxWidth);
    }

    // If we have an explicit width, use that but still respect maxWidth
    if (style.width !== "auto") {
      const explicitWidth = typeof style.width === "number" ? style.width : 0;
      const constrainedWidth = Number.isFinite(maxWidth)
        ? Math.min(explicitWidth, maxWidth)
        : explicitWidth;
      targetContentWidth = Math.max(constrainedWidth - horizontalPadding, 1);
    } else if (Number.isFinite(maxWidth)) {
      targetContentWidth = Math.max(maxWidth - horizontalPadding, 1);
    }

    // Wrap the text using the target width
    if (targetContentWidth !== undefined && targetContentWidth > 0) {
      this.lines = wrapText(
        content,
        Math.floor(targetContentWidth),
        style.textWrap,
        style.lineClamp,
      );
    } else {
      const fallbackLines = content.split(/\r?\n/);
      this.lines = fallbackLines.length > 0 ? fallbackLines : [""];
    }

    if (this.lines.length === 0) {
      this.lines = [""];
    }

    const contentWidth = this.lines.reduce(
      (max, line) => Math.max(max, line.length),
      0,
    );
    const contentHeight = this.lines.length;

    const intrinsicWidth = contentWidth + horizontalPadding;
    const intrinsicHeight = contentHeight + verticalPadding;

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
    const padding = style.padding;
    const innerWidth = Math.max(size.width - (padding.left + padding.right), 0);
    const innerHeight = Math.max(
      size.height - (padding.top + padding.bottom),
      0,
    );
    const totalHeight = this.lines.length;
    const verticalAlign = normalizeCrossAlign(style.align);
    const offsetY = alignOffset(innerHeight, totalHeight, verticalAlign);

    this.contentRect = {
      x: origin.x + padding.left,
      y: origin.y + padding.top + offsetY,
      width: innerWidth,
      height: innerHeight,
    };
    this.dirty = false;
  }

  _paint(): PaintResult {
    const snapshot = this.getStyleSnapshot();
    const layout = this.getLayoutRect();
    const style = this.getResolvedStyle();
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

    const padding = style.padding;
    const innerWidth = Math.max(
      layout.width - (padding.left + padding.right),
      0,
    );
    const baseY = this.contentRect.y;
    const horizontalAlign = horizontalAlignFromDistribute(style.distribute);

    this.lines.forEach((line, index) => {
      const offsetX = alignOffset(innerWidth, line.length, horizontalAlign);
      spans.push({
        x: this.contentRect.x + offsetX,
        y: baseY + index,
        text: line,
        style: snapshot,
      });
    });

    return { spans, rects };
  }
}

export function Text(content?: string | Signal<string>): Node {
  return new TextNode(content);
}
