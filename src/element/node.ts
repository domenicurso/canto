import { StyleBuilder } from "../style/builder";

import type { Style, StyleDefinition } from "../style/types";
import type { DrawingContext } from "./drawing";
import type { ElementEvents, ElementRef, KeyEvent, PointerEvent } from "./events";
import type { ElementProps } from "./props";

export type Kind =
  | "text"
  | "row"
  | "column"
  | "box"
  | "overlay"
  | "button"
  | "input"
  | "textarea"
  | "scroll"
  | "component"
  | "canvas";
export type Child = Element | string | number | null | undefined | false | readonly Child[];
export type Component<P> = (props: P) => Child;
export interface ComponentCall {
  render: () => Child;
  identity: object;
}
export interface ElementData {
  kind: Kind;
  children: readonly Child[];
  props: ElementProps;
  text?: string;
  runs?: readonly { text: string; style: Readonly<Style> }[];
  draw?: (context: DrawingContext) => void;
  key?: string | number;
  call?: ComponentCall;
}
export class Element extends StyleBuilder {
  constructor(
    readonly data: ElementData,
    definition?: StyleDefinition,
  ) {
    super(definition);
  }
  protected override copy(definition: StyleDefinition): this {
    // Fluent operations preserve the concrete element and never mutate its description.
    return new Element(this.data, definition) as this;
  }
  private withData(data: Partial<ElementData>): this {
    return new Element({ ...this.data, ...data }, this.definition) as this;
  }
  private event(props: ElementEvents): this {
    return this.withData({ props: { ...this.data.props, ...props } });
  }
  key(key: string | number): this {
    return this.withData({ key });
  }
  onKey(onKey: (event: KeyEvent) => void): this {
    return this.event({ onKey });
  }
  onFocus(onFocus: () => void): this {
    return this.event({ onFocus });
  }
  onBlur(onBlur: () => void): this {
    return this.event({ onBlur });
  }
  onMouse(onMouse: (event: PointerEvent) => void): this {
    return this.event({ onMouse });
  }
  ref(ref: (element: ElementRef | null) => void): this {
    return this.event({ ref });
  }
  focusable(focusable = true): this {
    return this.event({ focusable });
  }
  tabIndex(tabIndex: number): this {
    return this.event({ tabIndex });
  }
  autoFocus(autoFocus = true): this {
    return this.event({ autoFocus });
  }
}
export function component<P = void>(
  render: Component<P>,
): (...args: P extends void ? [props?: P] : [props: P]) => Element {
  return (...args) =>
    new Element({
      kind: "component",
      children: [],
      props: {},
      call: {
        identity: render, // An omitted argument is permitted only for a component whose props are void.
        render: () => render(args[0] as P),
      },
    });
}
export function flatten(children: readonly Child[]): Element[] {
  const result: Element[] = [];
  for (const child of children) {
    if (Array.isArray(child)) result.push(...flatten(child));
    else if (child instanceof Element) result.push(child);
    else if (typeof child === "string" || typeof child === "number") {
      result.push(new Element({ kind: "text", children: [], props: {}, text: String(child) }));
    }
  }
  return result;
}
