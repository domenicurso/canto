import {
  alignOffset,
  applyMinMax,
  clamp,
  resolveDimension,
  wrapText,
} from "../layout";
import { BaseNode } from "./node";

import type { Constraints } from "../layout";
import type { Signal } from "../signals";
import type { ResolvedStyle } from "../style";
import type { LayoutRect, PaintResult, Point, Size } from "../types";
import type { TextareaProps } from "./props";

export class TextareaNode extends BaseNode<TextareaProps> {
  private value = "";
  private cursor = 0;
  private focused = false;
  private lines: string[] = [];

  constructor() {
    super("Textarea", []);
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

  getValue(): string {
    return this.value;
  }

  moveCursor(delta: number): void {
    this.cursor = Math.max(0, Math.min(this.value.length, this.cursor + delta));
    this._invalidate();
  }

  setCursor(position: number): void {
    this.cursor = Math.max(0, Math.min(this.value.length, position));
    this._invalidate();
  }

  getCursorPosition(): LayoutRect {
    const layout = this.getLayoutRect();
    const style = this.getResolvedStyle();
    const padding = style.padding;
    const before = this.value.slice(0, this.cursor);
    const lines = before.split(/\r?\n/);
    const lineIndex = lines.length - 1;
    const column = lines[lines.length - 1]?.length ?? 0;
    const x = layout.x + padding.left + column;
    const y = layout.y + padding.top + lineIndex;
    return { x, y, width: 1, height: 1 };
  }

  _measure(constraints: Constraints, inherited: ResolvedStyle): Size {
    const style = this.resolveCurrentStyle(inherited);
    const padding = style.padding;
    const availableWidth =
      constraints.maxWidth - (padding.left + padding.right);
    const innerWidth = Number.isFinite(availableWidth)
      ? Math.max(Math.floor(availableWidth), 1)
      : undefined;
    const content = this.value.length > 0 ? this.value : this.getPlaceholder();

    if (innerWidth !== undefined) {
      this.lines = wrapText(content, innerWidth, style.textWrap);
    } else {
      const fallback = content.split(/\r?\n/);
      this.lines = fallback.length > 0 ? fallback : [""];
    }

    const contentWidth = this.lines.reduce(
      (max, line) => Math.max(max, line.length),
      0,
    );
    const contentHeight = this.lines.length;

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
    const totalHeight = this.lines.length;
    const offsetY = alignOffset(innerHeight, totalHeight, style.yAlign);
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
    const padding = style.padding;
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
    const offsetY = this.contentRect.y - (layout.y + padding.top);

    this.lines.forEach((line, index) => {
      const offsetX = alignOffset(innerWidth, line.length, style.xAlign);
      spans.push({
        x: layout.x + padding.left + offsetX,
        y: layout.y + padding.top + offsetY + index,
        text: line,
        style: snapshot,
      });
    });

    return { spans, rects };
  }
}

export function Textarea(): TextareaNode {
  return new TextareaNode();
}
