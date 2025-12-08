import { alignOffset, wrapText } from "../layout";
import { BaseNode } from "./node";
import {
  horizontalAlignFromDistribute,
  normalizeCrossAlign,
  resolveAxisSize,
} from "./style-utils";

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

  private containsMouseSequence(text: string): boolean {
    // Check for SGR mouse events or basic mouse events
    return /\x1b\[<\d+;\d+;\d+[Mm]/.test(text) || /\x1b\[M.{3}/.test(text);
  }

  insert(text: string): void {
    if (this.isDisabled()) {
      return;
    }

    // Filter out mouse escape sequences
    if (this.containsMouseSequence(text)) {
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
    const horizontalPadding = padding.left + padding.right;
    const verticalPadding = padding.top + padding.bottom;
    const availableWidth = constraints.maxWidth - horizontalPadding;
    const wrapWidth = Number.isFinite(availableWidth)
      ? Math.max(Math.floor(availableWidth), 1)
      : undefined;
    const content = this.value.length > 0 ? this.value : this.getPlaceholder();

    if (wrapWidth !== undefined && wrapWidth > 0) {
      this.lines = wrapText(
        content,
        wrapWidth,
        style.textWrap,
        style.lineClamp,
      );
    } else {
      const fallback = content.split(/\r?\n/);
      this.lines = fallback.length > 0 ? fallback : [""];
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

    const innerWidth = Math.max(this.contentRect.width, 0);
    const baseX = this.contentRect.x;
    const baseY = this.contentRect.y;
    const horizontalAlign = horizontalAlignFromDistribute(style.distribute);

    this.lines.forEach((line, index) => {
      const offsetX = alignOffset(innerWidth, line.length, horizontalAlign);
      spans.push({
        x: baseX + offsetX,
        y: baseY + index,
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
