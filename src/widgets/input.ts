import { alignOffset, applyMinMax, clamp, resolveDimension } from "../layout";
import { BaseNode } from "./node";

import type { Constraints } from "../layout";
import type { Signal } from "../signals";
import type { ResolvedStyle } from "../style";
import type { LayoutRect, PaintResult, Point, Size } from "../types";
import type { InputProps } from "./props";

export class InputNode extends BaseNode<InputProps> {
  private value = "";
  private cursor = 0;
  private focused = false;

  constructor() {
    super("Input", []);
  }

  override bind(signal: Signal<string>): this {
    if (this.bindingSubscription) {
      this.bindingSubscription();
    }
    this.binding = signal;
    this.value = signal.get();
    this.cursor = this.value.length;
    this.bindingSubscription = signal.subscribe((next) => {
      if (typeof next === "string" && next !== this.value) {
        this.value = next;
        this.cursor = Math.min(this.cursor, this.value.length);
        this._invalidate();
      }
    });
    this._invalidate();
    return this;
  }

  private getPlaceholder(): string {
    const placeholder = this.getProp("placeholder");
    return (placeholder as string) ?? "";
  }

  private isDisabled(): boolean {
    return Boolean(this.getProp("disabled"));
  }

  private applyFilter(value: string): string {
    const filter = this.getProp("filter");
    return typeof filter === "function" ? filter(value) : value;
  }

  private isValid(value: string): boolean {
    const validator = this.getProp("validator");
    return typeof validator === "function" ? validator(value) !== false : true;
  }

  private commitValue(next: string, notify = true): void {
    const filtered = this.applyFilter(next);
    if (!this.isValid(filtered)) {
      return;
    }
    this.value = filtered;
    this.cursor = Math.min(this.cursor, this.value.length);
    if (this.binding) {
      this.binding.set(this.value);
    }
    if (notify) {
      const handler = this.propsDefinition.onChange;
      if (typeof handler === "function") {
        handler(this.value);
      }
    }
    this._invalidate();
  }

  override focus(): void {
    if (this.focused || this.isDisabled()) {
      return;
    }
    this.focused = true;
    super.focus();
    this._invalidate();
  }

  override blur(): void {
    if (!this.focused) {
      return;
    }
    this.focused = false;
    super.blur();
    this._invalidate();
  }

  moveCursor(delta: number): void {
    this.cursor = Math.max(0, Math.min(this.value.length, this.cursor + delta));
    this._invalidate();
  }

  setCursor(position: number): void {
    this.cursor = Math.max(0, Math.min(this.value.length, position));
    this._invalidate();
  }

  insert(text: string): void {
    if (this.isDisabled()) {
      return;
    }
    const before = this.value.slice(0, this.cursor);
    const after = this.value.slice(this.cursor);
    const next = before + text + after;
    this.cursor += text.length;
    this.commitValue(next);
  }

  backspace(): void {
    if (this.isDisabled() || this.cursor === 0) {
      return;
    }
    const before = this.value.slice(0, this.cursor - 1);
    const after = this.value.slice(this.cursor);
    this.cursor -= 1;
    this.commitValue(before + after);
  }

  delete(): void {
    if (this.isDisabled() || this.cursor >= this.value.length) {
      return;
    }
    const before = this.value.slice(0, this.cursor);
    const after = this.value.slice(this.cursor + 1);
    this.commitValue(before + after);
  }

  submit(): void {
    const handler = this.propsDefinition.onSubmit;
    if (typeof handler === "function") {
      handler(this.value);
    }
  }

  getValue(): string {
    return this.value;
  }

  getCursor(): LayoutRect {
    const layout = this.getLayoutRect();
    const style = this.getResolvedStyle();
    const padding = style.padding;
    const x = layout.x + padding.left + this.cursor;
    const y = layout.y + padding.top;
    return { x, y, width: 1, height: 1 };
  }

  isFocused(): boolean {
    return this.focused;
  }

  _measure(constraints: Constraints, inherited: ResolvedStyle): Size {
    const style = this.resolveCurrentStyle(inherited);
    const padding = style.padding;
    const display = this.value.length > 0 ? this.value : this.getPlaceholder();
    const contentWidth = Math.max(display.length, 1);
    const contentHeight = 1;

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
    const displayLength = Math.max(
      this.value.length,
      this.getPlaceholder().length,
      1,
    );
    const offsetX = alignOffset(innerWidth, displayLength, style.xAlign);
    this.contentRect = {
      x: origin.x + padding.left + offsetX,
      y: origin.y + padding.top,
      width: innerWidth,
      height: 1,
    };
    this.dirty = false;
  }

  _paint(): PaintResult {
    const snapshot = this.getStyleSnapshot();
    const layout = this.getLayoutRect();
    const style = this.getResolvedStyle();
    const padding = style.padding;
    const text = this.value.length > 0 ? this.value : this.getPlaceholder();
    const spans: PaintResult["spans"] = [];
    const rects: PaintResult["rects"] = [];

    rects.push({
      x: layout.x,
      y: layout.y,
      width: layout.width,
      height: layout.height,
      style: snapshot,
    });

    const innerWidth = Math.max(
      layout.width - (padding.left + padding.right),
      0,
    );
    const offsetX = alignOffset(innerWidth, text.length, style.xAlign);

    spans.push({
      x: layout.x + padding.left + offsetX,
      y: layout.y + padding.top,
      text,
      style: snapshot,
    });

    return { spans, rects };
  }
}

export function Input(): InputNode {
  return new InputNode();
}
