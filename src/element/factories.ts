import type { DrawingContext } from "./drawing";
import type { Child } from "./node";
import type { OverlayProps } from "./overlay";
import type { ButtonProps, InputProps, ScrollProps } from "./props";

import { Element, flatten } from "./node";

export function text(...content: Child[]): Element {
  const elements = flatten(content);
  const runs = elements.flatMap((element) => {
    if (element.data.kind !== "text")
      throw new Error("Text spans must contain only text.");
    return (
      element.data.runs?.map((run) => ({
        text: run.text,
        style: { ...element.definition.base, ...run.style },
      })) ?? [{ text: element.data.text ?? "", style: element.definition.base }]
    );
  });
  return new Element({
    kind: "text",
    text: runs.map((run) => run.text).join(""),
    runs,
    children: [],
    props: {},
  });
}
export function canvas(draw: (context: DrawingContext) => void): Element {
  return new Element({ kind: "canvas", draw, children: [], props: {} });
}
export function row(...children: Child[]): Element {
  return new Element({ kind: "row", children, props: {} });
}
export function column(...children: Child[]): Element {
  return new Element({ kind: "column", children, props: {} });
}
export function box(...children: Child[]): Element {
  return new Element({ kind: "box", children, props: {} });
}
export function overlay(options: OverlayProps): Element;
export function overlay(...children: Child[]): Element;
export function overlay(
  first?: Child | OverlayProps,
  ...rest: Child[]
): Element {
  if (first && typeof first === "object" && "content" in first)
    return new Element({
      kind: "overlay",
      children: [first.content],
      props: { overlay: first, focusable: first.modal, tabIndex: -1 },
    }).position("absolute");
  return new Element({
    kind: "overlay",
    children: [first, ...rest],
    props: {},
  });
}
export function button(
  content: Child,
  options: ButtonProps | (() => void),
): Element {
  const props = typeof options === "function" ? { onPress: options } : options;
  return new Element({
    kind: "button",
    children: [content],
    props: { button: props },
  });
}
export function input(props: InputProps = {}): Element {
  return new Element({ kind: "input", children: [], props: { input: props } });
}
export function textarea(props: InputProps = {}): Element {
  return new Element({
    kind: "textarea",
    children: [],
    props: { input: props },
  });
}
export function scroll(content: Child, props: ScrollProps = {}): Element {
  const friction =
    typeof props.physics === "object" ? props.physics.friction : undefined;
  if (friction !== undefined && (!Number.isFinite(friction) || friction <= 0))
    throw new Error("Scroll physics friction must be finite and positive.");
  const momentum =
    typeof props.physics === "object" ? props.physics.momentum : undefined;
  if (momentum !== undefined && (!Number.isFinite(momentum) || momentum < 0))
    throw new Error("Scroll physics momentum must be finite and nonnegative.");
  return new Element({
    kind: "scroll",
    children: [content],
    props: { scroll: props },
  });
}
