import type { Alignment, Dimension, Distribution, Padding } from "./types";

import { DecorationBuilder } from "./decoration-builder";

export abstract class LayoutBuilder extends DecorationBuilder {
  width(width: Dimension): this {
    return this.style({ width });
  }
  height(height: Dimension): this {
    return this.style({ height });
  }
  minWidth(minWidth: number): this {
    return this.style({ minWidth });
  }
  maxWidth(maxWidth: number): this {
    return this.style({ maxWidth });
  }
  minHeight(minHeight: number): this {
    return this.style({ minHeight });
  }
  maxHeight(maxHeight: number): this {
    return this.style({ maxHeight });
  }
  fill(): this {
    return this.style({ width: "fill", height: "fill" });
  }
  grow(grow = 1): this {
    return this.style({ grow });
  }
  shrink(shrink = 1): this {
    return this.style({ shrink });
  }
  joinBorders(joinBorders = true): this {
    return this.style({ joinBorders });
  }
  selectable(selectable = true): this {
    return this.style({ selectable });
  }
  gap(gap: number): this {
    return this.style({ gap, columnGap: undefined, rowGap: undefined });
  }
  padding(padding: Padding): this {
    return this.style({
      padding,
      paddingTop: undefined,
      paddingRight: undefined,
      paddingBottom: undefined,
      paddingLeft: undefined,
    });
  }
  justify(justify: Distribution): this {
    return this.style({ justify });
  }
  align(align: Alignment): this {
    return this.style({ align });
  }
  alignSelf(alignSelf: Alignment): this {
    return this.style({ alignSelf });
  }
  position(position: "static" | "absolute"): this {
    return this.style({ position });
  }
  top(top: number): this {
    return this.style({ top });
  }
  right(right: number): this {
    return this.style({ right });
  }
  bottom(bottom: number): this {
    return this.style({ bottom });
  }
  left(left: number): this {
    return this.style({ left });
  }
  zIndex(zIndex: number): this {
    return this.style({ zIndex });
  }
  overflow(overflow: "clip" | "visible" | "ellipsis"): this {
    return this.style({ overflow });
  }
  wrap(wrap: "word" | "character" | "none"): this {
    return this.style({ wrap });
  }
  maxLines(maxLines: number): this {
    return this.style({ maxLines });
  }
  columnGap(columnGap: number): this {
    return this.style({ columnGap });
  }
  rowGap(rowGap: number): this {
    return this.style({ rowGap });
  }
  paddingTop(paddingTop: number): this {
    return this.style({ paddingTop });
  }
  paddingRight(paddingRight: number): this {
    return this.style({ paddingRight });
  }
  paddingBottom(paddingBottom: number): this {
    return this.style({ paddingBottom });
  }
  paddingLeft(paddingLeft: number): this {
    return this.style({ paddingLeft });
  }
  translate(x: number, y: number): this {
    return this.style({ translateX: x, translateY: y });
  }
}
