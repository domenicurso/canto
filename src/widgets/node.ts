import { batch, isSignal } from "../signals";
import { createDefaultStyle, resolveStyle } from "../style";

import type { Constraints } from "../layout";
import type { Signal } from "../signals";
import type { ResolvedStyle, StyleMap, StyleSnapshot } from "../style";
import type { LayoutRect, PaintResult, Point, Rect, Size } from "../types";
import type { PropsMap } from "./props";

export type NodeType =
  | "Stack"
  | "VStack"
  | "HStack"
  | "Text"
  | "Input"
  | "Textarea"
  | "Scrollable"
  | "Button"
  | "Image";

export interface Node {
  readonly type: NodeType;
  readonly children: readonly Node[];
  readonly id: string;
  style(map?: Partial<StyleMap>): Node;
  props(map?: Partial<PropsMap>): Node;
  bind(signal: Signal<string>): Node;
  key(key: string): Node;
  when(condition: Signal<boolean>): Node;
  unless(condition: Signal<boolean>): Node;
  _measure(constraints: Constraints, inherited: ResolvedStyle): Size;
  _layout(origin: Point, size: Size): void;
  _paint(): PaintResult;
  _invalidate(rect?: Rect): void;
}

let nodeId = 0;

type Disposer = () => void;

export abstract class BaseNode<TProps extends object = object> implements Node {
  readonly id: string;
  readonly type: NodeType;
  protected _children: Node[];
  protected styleDefinition: Partial<StyleMap> = {};
  protected propsDefinition: Partial<TProps> = {};
  protected styleSubscriptions: Disposer[] = [];
  protected propsSubscriptions: Disposer[] = [];
  protected binding: Signal<string> | null = null;
  protected bindingSubscription: Disposer | null = null;
  protected keyValue: string | null = null;
  protected resolvedStyle: ResolvedStyle = createDefaultStyle();
  protected layoutRect: LayoutRect = { x: 0, y: 0, width: 0, height: 0 };
  protected contentRect: LayoutRect = { x: 0, y: 0, width: 0, height: 0 };
  protected parent: BaseNode | null = null;
  protected dirty = true;
  protected overflow = false;

  protected constructor(type: NodeType, children: Node[] = []) {
    this.id = `${type}_${nodeId++}`;
    this.type = type;
    this._children = [];
    this.setChildren(children);
  }

  get children(): readonly Node[] {
    return this._children;
  }

  style(map?: Partial<StyleMap>): this {
    if (!map) {
      return this;
    }
    Object.assign(this.styleDefinition, map);
    this.resetStyleSubscriptions();
    this._invalidate();
    return this;
  }

  props(map?: Partial<TProps & PropsMap>): this {
    if (!map) {
      return this;
    }
    Object.assign(this.propsDefinition, map);
    this.resetPropSubscriptions();
    this._invalidate();
    return this;
  }

  bind(signal: Signal<string>): this {
    this.binding = signal;
    if (this.bindingSubscription) {
      this.bindingSubscription();
    }
    this.bindingSubscription = signal.subscribe(() => {
      this._invalidate();
    });
    this._invalidate();
    return this;
  }

  key(key: string): this {
    this.keyValue = key;
    return this;
  }

  when(condition: Signal<boolean>): ConditionalWrapper {
    return new ConditionalWrapper(condition, this, false);
  }

  unless(condition: Signal<boolean>): ConditionalWrapper {
    return new ConditionalWrapper(condition, this, true);
  }

  protected setChildren(children: Node[]): void {
    this._children = children;
    for (const child of this._children) {
      if (child instanceof BaseNode) {
        child.parent = this;
      }
    }
  }

  protected resetStyleSubscriptions(): void {
    for (const dispose of this.styleSubscriptions) {
      dispose();
    }
    this.styleSubscriptions = [];
    for (const value of Object.values(this.styleDefinition)) {
      if (isSignal(value)) {
        const signal = value as Signal<any>;
        this.styleSubscriptions.push(
          signal.subscribe(() => this._invalidate()),
        );
      }
    }
  }

  protected resetPropSubscriptions(): void {
    for (const dispose of this.propsSubscriptions) {
      dispose();
    }
    this.propsSubscriptions = [];
    for (const value of Object.values(this.propsDefinition)) {
      if (isSignal(value)) {
        const signal = value as Signal<any>;
        this.propsSubscriptions.push(
          signal.subscribe(() => this._invalidate()),
        );
      }
    }
  }

  protected resolveCurrentStyle(inherited: ResolvedStyle): ResolvedStyle {
    this.resolvedStyle = resolveStyle(inherited, this.styleDefinition);
    return this.resolvedStyle;
  }

  public getResolvedStyle(): ResolvedStyle {
    return this.resolvedStyle;
  }

  protected getStyleSnapshot(): StyleSnapshot {
    const style = this.resolvedStyle;
    return {
      foreground: style.foreground ?? null,
      background: style.background ?? null,
      bold: style.bold,
      italic: style.italic,
      underline: style.underline,
      faint: style.faint,
    };
  }

  protected getProp<K extends keyof TProps>(key: K): any {
    const value = this.propsDefinition[key];
    if (value && isSignal(value)) {
      return (value as unknown as Signal<any>).get();
    }
    return value;
  }

  protected getBindingValue(): string {
    if (this.binding) {
      return this.binding.get();
    }
    return "";
  }

  protected setBindingValue(value: string): void {
    if (this.binding) {
      batch(() => this.binding!.set(value));
    }
  }

  protected readPropValue(key: string): any {
    const props = this.propsDefinition as Record<string, any>;
    const value = props?.[key];
    if (isSignal(value)) {
      return value.get();
    }
    return value;
  }

  isFocusable(): boolean {
    if (this.type === "Input" || this.type === "Textarea") {
      return !Boolean(this.readPropValue("disabled"));
    }
    const focusable = this.readPropValue("focusable");
    return Boolean(focusable);
  }

  triggerSubmit(): void {
    const handler = (this.propsDefinition as Record<string, any>)?.onSubmit;
    if (typeof handler === "function") {
      handler();
    }
  }

  focus(): void {
    const handler = this.readPropValue("onFocus");
    if (typeof handler === "function") {
      handler();
    }
  }

  blur(): void {
    const handler = this.readPropValue("onBlur");
    if (typeof handler === "function") {
      handler();
    }
  }

  protected notifyChange(handlerKey: keyof TProps, value: any): void {
    const handler = this.propsDefinition[handlerKey];
    if (typeof handler === "function") {
      (handler as (value: any) => void)(value);
    }
  }

  _invalidate(_rect?: Rect): void {
    if (this.dirty) {
      return;
    }
    this.dirty = true;
    if (this.parent) {
      this.parent._invalidate();
    }
  }

  abstract _measure(constraints: Constraints, inherited: ResolvedStyle): Size;

  abstract _layout(origin: Point, size: Size): void;

  abstract _paint(): PaintResult;

  protected getAbsoluteZ(): number {
    const ownZ = this.resolvedStyle?.zIndex ?? 0;
    if (this.parent instanceof BaseNode) {
      return this.parent.getAbsoluteZ() + ownZ;
    }
    return ownZ;
  }

  protected paintChildren(): PaintResult {
    const parentZ = this.getAbsoluteZ();
    const layered = this._children.map((child, index) => {
      const style = resolveNodeStyle(child);
      const childOffset = style?.zIndex ?? 0;
      const zIndex = parentZ + childOffset;
      return {
        zIndex,
        order: index,
        result: child._paint(),
      };
    });

    layered.sort((a, b) => {
      if (a.zIndex === b.zIndex) {
        return a.order - b.order;
      }
      return a.zIndex - b.zIndex;
    });

    const spans: PaintResult["spans"] = [];
    const rects: PaintResult["rects"] = [];
    let sequence = 0;

    const nextOrder = (offset?: number): number => {
      const base = sequence++;
      if (offset === undefined) {
        return base;
      }
      const finalOrder = base + offset;
      if (finalOrder >= sequence) {
        sequence = finalOrder + 1;
      }
      return finalOrder;
    };

    for (const layer of layered) {
      const layerZ = layer.zIndex;

      for (const rect of layer.result.rects) {
        const order = nextOrder(rect.order);
        rects.push({
          ...rect,
          zIndex: (rect.zIndex ?? 0) + layerZ,
          order,
        });
      }

      for (const span of layer.result.spans) {
        const order = nextOrder(span.order);
        spans.push({
          ...span,
          zIndex: (span.zIndex ?? 0) + layerZ,
          order,
        });
      }
    }
    return { spans, rects };
  }

  dispose(): void {
    for (const dispose of this.styleSubscriptions) {
      dispose();
    }
    this.styleSubscriptions = [];
    for (const dispose of this.propsSubscriptions) {
      dispose();
    }
    this.propsSubscriptions = [];
    if (this.bindingSubscription) {
      this.bindingSubscription();
      this.bindingSubscription = null;
    }
    for (const child of this._children) {
      if (child instanceof BaseNode) {
        child.dispose();
      }
    }
  }

  getLayoutRect(): LayoutRect {
    return this.layoutRect;
  }

  protected updateLayoutRect(origin: Point, size: Size): void {
    this.layoutRect = {
      x: origin.x,
      y: origin.y,
      width: size.width,
      height: size.height,
    };
    const padding = this.resolvedStyle.padding;
    this.contentRect = {
      x: origin.x + padding.left,
      y: origin.y + padding.top,
      width: Math.max(size.width - (padding.left + padding.right), 0),
      height: Math.max(size.height - (padding.top + padding.bottom), 0),
    };
  }

  protected setOverflow(value: boolean): void {
    this.overflow = value;
  }

  hasOverflow(): boolean {
    return this.overflow;
  }
}

class ConditionalWrapper implements Node {
  readonly id: string;
  readonly type: NodeType;
  readonly children: readonly Node[];

  private condition: Signal<boolean>;
  private wrappedNode: Node;
  private isUnless: boolean;
  private conditionSubscription: Disposer | null = null;

  constructor(condition: Signal<boolean>, node: Node, isUnless: boolean) {
    this.condition = condition;
    this.wrappedNode = node;
    this.isUnless = isUnless;
    this.id = `conditional_${node.id}`;
    this.type = node.type;
    this.children = node.children;
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

  private shouldRender(): boolean {
    const conditionValue = this.condition.get();
    return this.isUnless ? !conditionValue : conditionValue;
  }

  style(map?: Partial<StyleMap>): Node {
    this.wrappedNode.style(map);
    return this;
  }

  props(map?: Partial<PropsMap>): Node {
    this.wrappedNode.props(map);
    return this;
  }

  bind(signal: Signal<string>): Node {
    this.wrappedNode.bind(signal);
    return this;
  }

  key(key: string): Node {
    this.wrappedNode.key(key);
    return this;
  }

  when(condition: Signal<boolean>): Node {
    return new ConditionalWrapper(condition, this, false);
  }

  unless(condition: Signal<boolean>): Node {
    return new ConditionalWrapper(condition, this, true);
  }

  getWrappedNode(): Node {
    return this.wrappedNode;
  }

  _measure(constraints: Constraints, inherited: ResolvedStyle): Size {
    if (!this.shouldRender()) {
      return { width: 0, height: 0 };
    }
    return this.wrappedNode._measure(constraints, inherited);
  }

  _layout(origin: Point, size: Size): void {
    if (!this.shouldRender()) {
      return;
    }
    this.wrappedNode._layout(origin, size);
  }

  _paint(): PaintResult {
    if (!this.shouldRender()) {
      return { spans: [], rects: [] };
    }
    return this.wrappedNode._paint();
  }

  _invalidate(rect?: Rect): void {
    this.wrappedNode._invalidate(rect);
  }

  dispose(): void {
    if (this.conditionSubscription) {
      this.conditionSubscription();
      this.conditionSubscription = null;
    }
    if (this.wrappedNode instanceof BaseNode) {
      this.wrappedNode.dispose();
    }
  }
}

export function resolveNodeStyle(node: Node): ResolvedStyle | null {
  if (node instanceof BaseNode) {
    return node.getResolvedStyle();
  }
  if (node instanceof ConditionalWrapper) {
    return resolveNodeStyle(node.getWrappedNode());
  }
  return null;
}
