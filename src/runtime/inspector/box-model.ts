import type { Element } from "../../element/node";
import type { Mounted } from "../components/tree";
import type { BoxTarget } from "./box-editor";

import { button, column, overlay, row, text } from "../../element/factories";
import { component } from "../../element/node";
import { padding } from "../../style/types";
import { useState } from "../components/hooks";
import { BoxEditor } from "./box-editor";
import { debugColors } from "./controls";
import { hasEdits } from "./edits";

interface BoxProps {
  node: Mounted;
  width: number;
  changed: () => void;
}
export const BoxModel = component(function BoxModel({
  node,
  width,
  changed,
}: BoxProps) {
  const [target, setTarget] = useState<BoxTarget | undefined>(undefined);
  const { pads, borders, content, value } = boxValues(node, setTarget);
  const { rect, style } = node.layout;
  return column(
    ring({
      label: "border",
      sides: borders,
      content: ring({
        label: "padding",
        sides: pads,
        content,
        width: width - 6,
      })
        .background("#354137")
        .color("#c4d0bc"),
      width,
    })
      .background("#484233")
      .color("#d8cdb1"),
    row(
      text("width "),
      value("layout.width", "Width", rect.width),
      text("   height "),
      value("layout.height", "Height", rect.height),
    )
      .justify("center")
      .width("fill")
      .color(debugColors.muted),
    row(
      text("row gap "),
      value("rowGap", "Row gap", style.rowGap ?? style.gap ?? 0),
      text("   column gap "),
      value("columnGap", "Column gap", style.columnGap ?? style.gap ?? 0),
    )
      .justify("center")
      .width("fill")
      .color(debugColors.muted),
    target &&
      boxDialog({ node, width, changed }, target, () => setTarget(undefined)),
  ).width("fill");
});
function boxDialog(props: BoxProps, target: BoxTarget, close: () => void) {
  return overlay({
    modal: true,
    placement: "center",
    onDismiss: close,
    content: BoxEditor({
      node: props.node,
      target,
      close,
      changed: props.changed,
    }),
  }).width(Math.min(32, Math.max(12, props.width)));
}

function boxValues(node: Mounted, setTarget: (target: BoxTarget) => void) {
  const { style, inner } = node.layout;
  const p = padding(style.padding);
  const names = ["Top", "Right", "Bottom", "Left"] as const;
  const value = (key: string, label: string, current: number) =>
    button(text(String(current)).wrap("none"), () =>
      setTarget({ key, label, value: current }),
    )
      .focusable(false)
      .underline(hasEdits(node, key));
  const pads = names.map((side, index) =>
    value(
      `padding${side}`,
      `padding${side}`,
      style[`padding${side}`] ?? p[index] ?? 0,
    ),
  );
  const borders = names.map((side) =>
    value(
      `box.border${side}`,
      `border${side}`,
      style.border &&
        style.border !== "none" &&
        style[`border${side}`] !== false
        ? 1
        : 0,
    ),
  );
  const content = row(
    value("content.width", "Content width", inner.width),
    text(" x "),
    value("content.height", "Content height", inner.height),
  )
    .justify("center")
    .width("fill")
    .background("#34434c")
    .color("#c2d5df");
  return { pads, borders, content, value };
}

function ring({
  label,
  sides,
  content,
  width,
}: {
  label: string;
  sides: Element[];
  content: Element;
  width: number;
}) {
  return column(
    row(
      sides[0],
      text(label)
        .position("absolute")
        .left(0)
        .top(0)
        .width(Math.max(0, Math.min(label.length, Math.floor(width / 2) - 2)))
        .wrap("none")
        .overflow("clip"),
    )
      .justify("center")
      .height(1)
      .width("fill"),
    row(
      row(sides[3]).justify("center").width(3),
      content.width("fill"),
      row(sides[1]).justify("center").width(3),
    )
      .align("center")
      .width("fill"),
    row(sides[2]).justify("center").height(1).width("fill"),
  ).width("fill");
}
