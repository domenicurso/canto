import type { Element } from "../../element/node";
import type { Mounted } from "../components/tree";

import { box, column, row, text } from "../../element/factories";
import { debugColors } from "./controls";

type BoxValue = (key: string, label: string, current: number) => Element;

export function dimensions(width: Element, height: Element) {
  return row(
    row(width).justify("end").width("fill"),
    text(" x ").width(3).shrink(0),
    row(height).width("fill"),
  ).width("fill");
}

/** A two-by-two grid puts each editable gap inside its corresponding gutter. */
export function gapDiagram(node: Mounted, value: BoxValue) {
  const { style } = node.layout;
  const gutter = "#503f32";
  const cell = () => box().width("fill").height(1).background("#303437");
  return row(
    column(text("column"), text("row"), text(""))
      .width(6)
      .color(debugColors.muted),
    column(
      row(
        cell(),
        row(value("columnGap", "Column gap", style.columnGap ?? style.gap ?? 0))
          .justify("center")
          .width(3)
          .background(gutter),
        cell(),
      ),
      row(value("rowGap", "Row gap", style.rowGap ?? style.gap ?? 0))
        .justify("center")
        .width("fill")
        .background(gutter),
      row(cell(), box().width(3).height(1).background(gutter), cell()),
    )
      .width(13)
      .color("#cbb49f"),
  )
    .gap(1)
    .justify("center")
    .height(3)
    .width("fill");
}
