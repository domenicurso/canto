import { alignOffset } from "../layout";
import { StateSignal } from "../signals/core";
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
import type { InputProps } from "./props";

export class InputNode extends BaseNode<InputProps> {
  private value = "";
  private cursor = 0;
  private focused = false;
  private selectionStart = 0;
  private selectionEnd = 0;
  private scrollOffset = 0;
  private cursorStateSignal = new StateSignal(0);

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
    this.selectionStart = this.cursor;
    this.selectionEnd = this.cursor;
    this.bindingSubscription = signal.subscribe((next) => {
      if (typeof next === "string" && next !== this.value) {
        this.value = next;
        this.cursor = Math.min(this.cursor, this.value.length);
        this.selectionStart = Math.min(this.selectionStart, this.value.length);
        this.selectionEnd = Math.min(this.selectionEnd, this.value.length);
        this.updateScroll();
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
    this.selectionStart = Math.min(this.selectionStart, this.value.length);
    this.selectionEnd = Math.min(this.selectionEnd, this.value.length);
    this.updateScroll();
    if (this.binding) {
      this.binding.set(this.value);
    }
    if (notify) {
      const handler = this.getProp("onChange");
      if (typeof handler === "function") {
        handler(this.value);
      }
    }
    this._invalidate();
  }

  private updateScroll(): void {
    const layout = this.getLayoutRect();
    if (!layout) return;

    const style = this.getResolvedStyle();
    const padding = style.padding;
    const availableWidth = Math.max(this.contentRect.width, 1);

    // If text fits, no scrolling needed
    if (this.value.length <= availableWidth) {
      this.scrollOffset = 0;
      return;
    }

    // Calculate effective visible width accounting for ellipsis
    let effectiveWidth = availableWidth;
    let needsLeadingEllipsis = this.scrollOffset > 0;
    let needsTrailingEllipsis =
      this.scrollOffset + availableWidth < this.value.length;

    // Reserve space for ellipsis
    if (needsLeadingEllipsis) effectiveWidth--;
    if (needsTrailingEllipsis) effectiveWidth--;

    // Minimal scrolling: only scroll when cursor is hidden by ellipsis
    const visibleStart = this.scrollOffset + (needsLeadingEllipsis ? 1 : 0);
    const visibleEnd =
      this.scrollOffset + availableWidth - (needsTrailingEllipsis ? 1 : 0);

    if (this.cursor < visibleStart) {
      // Cursor is hidden by leading ellipsis - scroll left minimally
      this.scrollOffset = Math.max(0, this.cursor - 1);
    } else if (this.cursor >= visibleEnd) {
      // Cursor is hidden by trailing ellipsis - scroll right minimally
      this.scrollOffset = this.cursor - availableWidth + 2; // +2 for ellipsis + cursor position
      this.scrollOffset = Math.max(0, this.scrollOffset);
    }

    // Final bounds check
    this.scrollOffset = Math.max(
      0,
      Math.min(this.scrollOffset, this.value.length - availableWidth + 1),
    );
  }

  private clearSelection(): void {
    this.selectionStart = this.cursor;
    this.selectionEnd = this.cursor;
    this.cursorStateSignal.set(this.cursorStateSignal.get() + 1);
  }

  private deleteSelection(): void {
    if (this.selectionStart === this.selectionEnd) return;

    const start = Math.min(this.selectionStart, this.selectionEnd);
    const end = Math.max(this.selectionStart, this.selectionEnd);
    const before = this.value.slice(0, start);
    const after = this.value.slice(end);
    this.cursor = start;
    this.clearSelection();
    this.commitValue(before + after);
  }

  private hasSelection(): boolean {
    return this.selectionStart !== this.selectionEnd;
  }

  override focus(): void {
    if (this.focused || this.isDisabled()) {
      return;
    }
    this.focused = true;
    super.focus();
    this._invalidate();
    this.cursorStateSignal.set(this.cursorStateSignal.get() + 1);
  }

  override blur(): void {
    if (!this.focused) {
      return;
    }
    this.focused = false;
    this.clearSelection();
    super.blur();
    this._invalidate();
  }

  override isFocusable(): boolean {
    return !this.isDisabled();
  }

  moveCursor(delta: number, extend = false): void {
    const newCursor = Math.max(
      0,
      Math.min(this.value.length, this.cursor + delta),
    );
    this.cursor = newCursor;

    if (extend) {
      this.selectionEnd = newCursor;
    } else {
      // Always reset selection when moving cursor without extend
      this.selectionStart = newCursor;
      this.selectionEnd = newCursor;
    }

    this.updateScroll();
    this._invalidate();
    this.cursorStateSignal.set(this.cursorStateSignal.get() + 1);
  }

  setCursor(position: number, extend = false): void {
    this.cursor = Math.max(0, Math.min(this.value.length, position));

    if (extend) {
      this.selectionEnd = this.cursor;
    } else {
      // Always reset selection when setting cursor without extend
      this.selectionStart = this.cursor;
      this.selectionEnd = this.cursor;
    }

    this.updateScroll();
    this._invalidate();
    this.cursorStateSignal.set(this.cursorStateSignal.get() + 1);
  }

  moveCursorToStart(extend = false): void {
    this.cursor = 0;

    if (extend) {
      this.selectionEnd = 0;
    } else {
      this.selectionStart = 0;
      this.selectionEnd = 0;
    }

    this.updateScroll();
    this._invalidate();
    this.cursorStateSignal.set(this.cursorStateSignal.get() + 1);
  }

  moveCursorToEnd(extend = false): void {
    this.cursor = this.value.length;

    if (extend) {
      this.selectionEnd = this.cursor;
    } else {
      this.selectionStart = this.cursor;
      this.selectionEnd = this.cursor;
    }

    this.updateScroll();
    this._invalidate();
    this.cursorStateSignal.set(this.cursorStateSignal.get() + 1);
  }

  selectAll(): void {
    this.selectionStart = 0;
    this.selectionEnd = this.value.length;
    this.cursor = this.value.length;
    this.updateScroll();
    this._invalidate();
    this.cursorStateSignal.set(this.cursorStateSignal.get() + 1);
  }

  selectWord(position: number, extend = false): void {
    const text = this.value;

    // Find word boundaries
    let start = position;
    let end = position;

    // Move start to beginning of word
    while (start > 0 && /\w/.test(text.charAt(start - 1))) {
      start--;
    }

    // Move end to end of word
    while (end < text.length && /\w/.test(text.charAt(end))) {
      end++;
    }

    if (extend) {
      if (position <= this.selectionStart) {
        this.selectionStart = start;
      } else {
        this.selectionEnd = end;
      }
    } else {
      this.selectionStart = start;
      this.selectionEnd = end;
    }

    this.cursor = end;
    this.updateScroll();
    this._invalidate();
    this.cursorStateSignal.set(this.cursorStateSignal.get() + 1);
  }

  insert(text: string): void {
    if (this.isDisabled() || !this.focused) {
      return;
    }

    // Delete selection if any
    if (this.hasSelection()) {
      this.deleteSelection();
    }

    const before = this.value.slice(0, this.cursor);
    const after = this.value.slice(this.cursor);
    const next = before + text + after;
    this.cursor += text.length;
    this.commitValue(next);
  }

  backspace(): void {
    if (this.isDisabled() || !this.focused) {
      return;
    }

    if (this.hasSelection()) {
      this.deleteSelection();
      return;
    }

    if (this.cursor === 0) return;

    const before = this.value.slice(0, this.cursor - 1);
    const after = this.value.slice(this.cursor);
    this.cursor -= 1;
    this.commitValue(before + after);
  }

  delete(): void {
    if (this.isDisabled() || !this.focused) {
      return;
    }

    if (this.hasSelection()) {
      this.deleteSelection();
      return;
    }

    if (this.cursor >= this.value.length) return;

    const before = this.value.slice(0, this.cursor);
    const after = this.value.slice(this.cursor + 1);
    this.commitValue(before + after);
  }

  submit(): void {
    const handler = this.getProp("onSubmit");
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

    // Calculate cursor position relative to scroll offset
    const displayCursor = this.cursor - this.scrollOffset;
    const x = layout.x + padding.left + displayCursor;
    const y = layout.y + padding.top;
    return { x, y, width: 1, height: 1 };
  }

  isFocused(): boolean {
    return this.focused;
  }

  override dispose(): void {
    this.cursorStateSignal.dispose();
    super.dispose();
  }

  _measure(constraints: Constraints, inherited: ResolvedStyle): Size {
    const style = this.resolveCurrentStyle(inherited);
    const padding = style.padding;

    // Calculate intrinsic dimensions
    const display = this.value.length > 0 ? this.value : this.getPlaceholder();
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
    this.updateLayoutRect(origin, size);
    const style = this.getResolvedStyle();
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

    this.updateScroll();
    this.dirty = false;
  }

  _paint(): PaintResult {
    const snapshot = this.getStyleSnapshot();
    const layout = this.getLayoutRect();
    const style = this.getResolvedStyle();
    const padding = style.padding;
    const spans: PaintResult["spans"] = [];
    const rects: PaintResult["rects"] = [];

    // Background rect - only if background color is specified
    if (snapshot.background) {
      rects.push({
        x: layout.x,
        y: layout.y,
        width: layout.width,
        height: layout.height,
        style: snapshot,
      });
    }

    // Calculate available width for text
    const availableWidth = Math.max(
      layout.width - (padding.left + padding.right),
      1,
    );

    // Get text to display
    const fullText = this.value.length > 0 ? this.value : this.getPlaceholder();
    const isPlaceholder = this.value.length === 0;

    // Handle horizontal scrolling and truncation
    let displayText = "";
    let showLeadingEllipsis = false;
    let showTrailingEllipsis = false;

    if (fullText.length === 0) {
      displayText = "";
    } else if (fullText.length <= availableWidth) {
      // Text fits completely
      displayText = fullText;
    } else {
      // Text needs scrolling/truncation
      let visibleStart = this.scrollOffset;
      let visibleEnd = this.scrollOffset + availableWidth;
      let reservedChars = 0;

      // Check if we need leading ellipsis
      if (visibleStart > 0) {
        showLeadingEllipsis = true;
        reservedChars++;
        visibleStart = this.scrollOffset + 1; // Make room for leading ellipsis
      }

      // Check if we need trailing ellipsis
      if (visibleEnd < fullText.length) {
        showTrailingEllipsis = true;
        reservedChars++;
        visibleEnd =
          this.scrollOffset + availableWidth - (showLeadingEllipsis ? 2 : 1);
      }

      // Extract visible text
      displayText = fullText.slice(
        visibleStart,
        Math.max(visibleStart, visibleEnd),
      );

      // Add ellipsis
      if (showLeadingEllipsis) {
        displayText = "…" + displayText;
      }
      if (showTrailingEllipsis) {
        displayText = displayText + "…";
      }
    }

    // Calculate text position
    const baseX = this.contentRect.x;
    const baseY = this.contentRect.y;
    const horizontalAlign = horizontalAlignFromDistribute(style.distribute);

    let textOffset = 0;
    if (
      this.scrollOffset === 0 &&
      !showLeadingEllipsis &&
      !showTrailingEllipsis
    ) {
      textOffset = alignOffset(
        availableWidth,
        displayText.length,
        horizontalAlign,
      );
    }

    const textX = baseX + textOffset;
    const textY = baseY;

    // Render main text
    if (displayText.length > 0) {
      spans.push({
        x: textX,
        y: textY,
        text: displayText,
        style: {
          ...snapshot,
          faint: isPlaceholder,
        },
      });
    }

    // Render selection if focused and has selection
    if (this.focused && this.hasSelection()) {
      const selStart = Math.min(this.selectionStart, this.selectionEnd);
      const selEnd = Math.max(this.selectionStart, this.selectionEnd);

      // Calculate visible selection bounds accounting for ellipsis
      let visibleSelStart = selStart - this.scrollOffset;
      let visibleSelEnd = selEnd - this.scrollOffset;

      // Adjust for leading ellipsis
      if (showLeadingEllipsis) {
        visibleSelStart = Math.max(visibleSelStart + 1, 1);
        visibleSelEnd = visibleSelEnd + 1;
      }

      // Adjust for trailing ellipsis
      const maxEnd = displayText.length - (showTrailingEllipsis ? 1 : 0);
      visibleSelEnd = Math.min(visibleSelEnd, maxEnd);

      // Clamp to visible bounds
      visibleSelStart = Math.max(visibleSelStart, showLeadingEllipsis ? 1 : 0);
      visibleSelEnd = Math.max(visibleSelEnd, visibleSelStart);

      if (
        visibleSelStart < visibleSelEnd &&
        visibleSelEnd > (showLeadingEllipsis ? 1 : 0)
      ) {
        const selectedText = displayText.slice(visibleSelStart, visibleSelEnd);
        if (selectedText.length > 0) {
          spans.push({
            x: textX + visibleSelStart,
            y: textY,
            text: selectedText,
            style: {
              ...snapshot,
              background: "brightWhite",
              foreground: "black",
            },
          });
        }
      }
    }

    return { spans, rects };
  }
}

export function Input(): InputNode {
  return new InputNode();
}
