import { BaseNode } from "./node";

import type { Constraints } from "../layout";
import type { Signal } from "../signals";
import type { ResolvedStyle } from "../style";
import type { LayoutRect, PaintResult, Point, Size } from "../types";
import type { Node } from "./node";

export class ConditionalNode extends BaseNode<{}> {
  private condition: Signal<boolean>;
  private child: Node | null = null;
  private conditionSubscription: (() => void) | null = null;

  constructor(condition: Signal<boolean>) {
    super("Text", []);
    this.condition = condition;
    this.setupConditionSubscription();
  }

  private setupConditionSubscription(): void {
    if (this.conditionSubscription) {
      this.conditionSubscription();
    }
    this.conditionSubscription = this.condition.subscribe(() => {
      this._invalidate();
    });
  }

  setChild(child: Node): this {
    this.child = child;
    if (child instanceof BaseNode) {
      (child as any).parent = this;
    }
    this.setChildren(this.child ? [this.child] : []);
    this._invalidate();
    return this;
  }

  override dispose(): void {
    if (this.conditionSubscription) {
      this.conditionSubscription();
      this.conditionSubscription = null;
    }
    super.dispose();
  }

  _measure(constraints: Constraints, inherited: ResolvedStyle): Size {
    // If condition is false, return zero dimensions
    if (!this.condition.get()) {
      return { width: 0, height: 0 };
    }

    // If condition is true and we have a child, measure the child
    if (this.child) {
      return this.child._measure(constraints, inherited);
    }

    // No child, return zero dimensions
    return { width: 0, height: 0 };
  }

  _layout(origin: Point, size: Size): void {
    this.updateLayoutRect(origin, size);

    // Only layout child if condition is true
    if (this.condition.get() && this.child) {
      this.child._layout(origin, size);
    }

    this.dirty = false;
  }

  _paint(): PaintResult {
    // If condition is false, return empty paint result
    if (!this.condition.get()) {
      return { spans: [], rects: [] };
    }

    // If condition is true and we have a child, paint the child
    if (this.child) {
      return this.child._paint();
    }

    // No child, return empty paint result
    return { spans: [], rects: [] };
  }
}

export function Conditional(condition: Signal<boolean>): ConditionalNode {
  return new ConditionalNode(condition);
}
