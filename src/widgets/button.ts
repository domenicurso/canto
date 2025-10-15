import { alignOffset } from "../layout";
import { BaseNode } from "./node";
import {
  horizontalAlignFromDistribute,
  normalizeCrossAlign,
  resolveAxisSize,
} from "./style-utils";

import type { Constraints } from "../layout";
import type { Signal } from "../signals";
import type { ResolvedStyle } from "../style";
import type { PaintResult, Point, Size } from "../types";
import type { ButtonProps } from "./props";

export class ButtonNode extends BaseNode<ButtonProps> {
  private literalLabel = "";
  private isFocused = false;

  constructor(label?: string | Signal<string>) {
    super("Button", []);
    if (typeof label === "string") {
      this.literalLabel = label;
    } else if (label) {
      this.bind(label);
    }
  }

  override bind(signal: Signal<string>): this {
    super.bind(signal);
    return this;
  }

  private getLabel(): string {
    const propLabel = this.propsDefinition.label;
    if (typeof propLabel === "string") {
      return propLabel;
    }
    if (propLabel && typeof (propLabel as Signal<string>).get === "function") {
      return (propLabel as Signal<string>).get();
    }
    if (this.binding) {
      return this.binding.get();
    }
    return this.literalLabel;
  }

  private isDisabled(): boolean {
    const disabled = this.propsDefinition.disabled;
    if (typeof disabled === "boolean") {
      return disabled;
    }
    if (disabled && typeof (disabled as Signal<boolean>).get === "function") {
      return Boolean((disabled as Signal<boolean>).get());
    }
    return false;
  }

  press(): void {
    if (this.isDisabled()) {
      return;
    }
    const handler = this.propsDefinition.onPress;
    if (typeof handler === "function") {
      handler();
    }
  }

  override focus(): void {
    if (this.isDisabled()) {
      return;
    }
    this.isFocused = true;
    super.focus();
    this._invalidate();
  }

  override blur(): void {
    if (!this.isFocused) {
      return;
    }
    this.isFocused = false;
    super.blur();
    this._invalidate();
  }

  _measure(constraints: Constraints, inherited: ResolvedStyle): Size {
    const style = this.resolveCurrentStyle(inherited);
    const padding = style.padding;
    const label = this.getLabel();
    const display = this.isDisabled() ? `[${label}]` : label;
    const contentWidth = Math.max(display.length, 1);
    const contentHeight = 1;

    const intrinsicWidth = contentWidth + padding.left + padding.right;
    const intrinsicHeight = contentHeight + padding.top + padding.bottom;

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
    const verticalAlign = normalizeCrossAlign(style.align);
    const offsetY = alignOffset(innerHeight, 1, verticalAlign);

    this.contentRect = {
      x: origin.x + padding.left,
      y: origin.y + padding.top + offsetY,
      width: innerWidth,
      height: innerHeight,
    };
    this.dirty = false;
  }

  _paint(): PaintResult {
    const style = this.getResolvedStyle();
    const snapshot = this.getStyleSnapshot();
    const layout = this.getLayoutRect();
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

    const label = this.getLabel();
    const display = this.isDisabled() ? `[${label}]` : label;
    const innerWidth = Math.max(this.contentRect.width, 0);
    const innerX = this.contentRect.x;
    const innerY = this.contentRect.y;
    const horizontalAlign = horizontalAlignFromDistribute(style.distribute);
    const offsetX = alignOffset(innerWidth, display.length, horizontalAlign);

    const spanStyle = {
      ...snapshot,
      bold: snapshot.bold || this.isFocused,
      underline: snapshot.underline || this.isFocused,
      faint: snapshot.faint || this.isDisabled(),
    };

    spans.push({
      x: innerX + offsetX,
      y: innerY,
      text: display,
      style: spanStyle,
    });

    return { spans, rects };
  }
}

export function Button(label?: string | Signal<string>): ButtonNode {
  return new ButtonNode(label);
}
