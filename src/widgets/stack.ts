import {
  finalizeStackMeasurement,
  layoutStack,
  prepareStackMeasurement,
} from "../layout";
import { BaseNode, resolveNodeStyle } from "./node";

import type {
  Constraints,
  PreparedStackMeasurement,
  StackLayoutResult,
  StackMeasurement,
} from "../layout";
import type { DimensionToken, FlowAxis, ResolvedStyle } from "../style";
import type { PaintResult, Point, Size } from "../types";
import type { Node } from "./node";
import type { ContainerProps } from "./props";

export abstract class StackNodeBase<
  TProps extends ContainerProps = ContainerProps,
> extends BaseNode<TProps> {
  private readonly flowOverride: FlowAxis | null;
  private measurement: StackMeasurement | null = null;

  protected constructor(
    type: Node["type"],
    children: Node[],
    flowOverride: FlowAxis | null,
  ) {
    super(type, children);
    this.flowOverride = flowOverride;
  }

  protected enforceFlow(style: ResolvedStyle): FlowAxis {
    if (this.flowOverride) {
      style.flow = this.flowOverride;
    }
    return style.flow;
  }

  protected getMeasurement(): StackMeasurement | null {
    return this.measurement;
  }

  _measure(constraints: Constraints, inherited: ResolvedStyle): Size {
    const style = this.resolveCurrentStyle(inherited);
    const axis = this.enforceFlow(style);

    // Fix percentage width resolution when constraints have infinite maxWidth
    let adjustedConstraints = constraints;
    if (typeof style.width === "string" && style.width.endsWith("%")) {
      if (!Number.isFinite(constraints.maxWidth)) {
        // When maxWidth is infinite, percentage resolution fails
        // Use "auto" sizing instead to let content determine the width
        const adjustedStyle: ResolvedStyle = {
          ...style,
          width: "auto" as DimensionToken,
        };
        const prepared = prepareStackMeasurement(
          axis,
          constraints,
          adjustedStyle,
        );

        // Measure children with auto sizing first
        const childSizes: Size[] = [];
        const childStyles: ResolvedStyle[] = [];
        for (const child of this.children) {
          const size = child._measure(prepared.innerConstraints, adjustedStyle);
          childSizes.push(size);
          const resolved = resolveNodeStyle(child) ?? adjustedStyle;
          childStyles.push(resolved);
        }

        const autoMeasurement = finalizeStackMeasurement(
          axis,
          constraints,
          adjustedStyle,
          prepared.candidateSize,
          childSizes,
          childStyles,
        );

        this.measurement = autoMeasurement;
        this.setOverflow(false);
        return this.measurement.outerSize;
      }
    }

    const prepared: PreparedStackMeasurement = prepareStackMeasurement(
      axis,
      adjustedConstraints,
      style,
    );

    const childSizes: Size[] = [];
    const childStyles: ResolvedStyle[] = [];

    for (const child of this.children) {
      const size = child._measure(prepared.innerConstraints, style);
      childSizes.push(size);
      const resolved = resolveNodeStyle(child) ?? style;
      childStyles.push(resolved);
    }

    this.measurement = finalizeStackMeasurement(
      axis,
      constraints,
      style,
      prepared.candidateSize,
      childSizes,
      childStyles,
    );
    this.setOverflow(false);
    return this.measurement.outerSize;
  }

  _layout(origin: Point, size: Size): void {
    if (!this.measurement) {
      // Fallback: measure with loose constraints based on provided size.
      const fallbackConstraints: Constraints = {
        minWidth: 0,
        maxWidth: size.width,
        minHeight: 0,
        maxHeight: size.height,
      };
      this._measure(fallbackConstraints, this.getResolvedStyle());
    }
    if (!this.measurement) {
      this.updateLayoutRect(origin, size);
      this.dirty = false;
      return;
    }

    const measurement = this.measurement;
    const adjustedInner: Size = {
      width: Math.max(
        size.width - (measurement.padding.left + measurement.padding.right),
        0,
      ),
      height: Math.max(
        size.height - (measurement.padding.top + measurement.padding.bottom),
        0,
      ),
    };

    const layoutMeasurement: StackMeasurement = {
      ...measurement,
      outerSize: size,
      innerSize: adjustedInner,
    };
    this.measurement = layoutMeasurement;

    this.updateLayoutRect(origin, size);
    const layout: StackLayoutResult = layoutStack(origin, layoutMeasurement);
    this.setOverflow(layout.overflow > 0);

    const items = layout.items;
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      const frame = items[i];
      if (!child || !frame) {
        child?._layout({ x: origin.x, y: origin.y }, { width: 0, height: 0 });
        continue;
      }
      child._layout(frame.origin, frame.size);
    }

    this.dirty = false;
  }

  _paint(): PaintResult {
    const result = this.paintChildren();
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

class GenericStackNode extends StackNodeBase {
  constructor(children: Node[]) {
    super("Stack", children, null);
  }
}

class HStackNode extends StackNodeBase {
  constructor(children: Node[]) {
    super("HStack", children, "x");
  }
}

class VStackNode extends StackNodeBase {
  constructor(children: Node[]) {
    super("VStack", children, "y");
  }
}

export function Stack(...children: Node[]): StackNodeBase {
  return new GenericStackNode(children);
}

export function HStack(...children: Node[]): StackNodeBase {
  return new HStackNode(children);
}

export function VStack(...children: Node[]): StackNodeBase {
  return new VStackNode(children);
}
