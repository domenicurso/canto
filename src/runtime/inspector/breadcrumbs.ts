import type { Mounted } from "../components/tree";
import type { DebugSelection } from "./selection";

import { button, row, text } from "../../element/factories";
import { style } from "../../style/builders/builder";
import { debugColors } from "./controls";

export function breadcrumbs(model: DebugSelection) {
  const path: Mounted[] = [];
  for (let node = model.selected; node; node = node.parent ?? undefined)
    path.unshift(node);
  return row(
    path.flatMap((node, index) => [
      index > 0 && text(" / ").color(debugColors.muted),
      button(
        text(node.element.data.call?.name || node.element.data.kind).wrap(
          "none",
        ),
        () => model.select(node),
      )
        .focusable(false)
        .color(node === model.selected ? debugColors.text : debugColors.muted)
        .hovered(
          style().background(debugColors.surface).color(debugColors.text),
        ),
    ]),
  )
    .height(1)
    .width("fill")
    .overflow("clip");
}
