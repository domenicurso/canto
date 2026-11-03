import type { Element } from "../../element/node";
import type { Mounted } from "../components/tree";

import { row, text } from "../../element/factories";
import { debugColors } from "./controls";

type BoxValue = (key: string, label: string, current: number) => Element;

export function dimensions(width: Element, height: Element) {
  return row(
    row(width).justify("end").width("fill"),
    text(" x ").width(3).shrink(0),
    row(height).width("fill"),
  ).width("fill");
}

/** Keep axis labels beside their values in one quiet footer, with spacing markers. */
export function gapControls(node: Mounted, value: BoxValue) {
  const { style } = node.layout;
  return row(
    text("gap").color(debugColors.muted),
    row(
      text("=").color("#a28d78"),
      text("row").color(debugColors.muted),
      value("rowGap", "Row gap", style.rowGap ?? style.gap ?? 0),
    ).gap(1),
    row(
      text("||").color("#a28d78"),
      text("column").color(debugColors.muted),
      value("columnGap", "Column gap", style.columnGap ?? style.gap ?? 0),
    ).gap(1),
  )
    .gap(2)
    .justify("center")
    .height(1)
    .width("fill")
    .background("#252525");
}
