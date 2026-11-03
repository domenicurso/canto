import type { Mounted } from "../components/tree";
import type { DebugSelection } from "./selection";

import { button, row, text } from "../../element/factories";
import { style } from "../../style/builders/builder";
import { width as columns } from "../../text/columns";
import { debugColors } from "./controls";

/** Spend space on the selected node and nearest ancestors before the root. */
export function breadcrumbNodes(
  model: DebugSelection,
  width: number,
): Mounted[] {
  const path: Mounted[] = [];
  let used = 0;
  for (let node = model.selected; node; node = node.parent ?? undefined) {
    const name = node.element.data.call?.name || node.element.data.kind;
    const cost = columns(name) + (path.length ? 3 : 0);
    if (path.length && used + cost + 4 > width) break;
    path.unshift(node);
    used += cost;
  }
  return path;
}
export function breadcrumbs(model: DebugSelection, width: number) {
  const path = breadcrumbNodes(model, width);
  const hidden = Boolean(path[0]?.parent);
  return row(
    hidden &&
      button(text("... ").color(debugColors.muted), () =>
        model.select(path[0]?.parent ?? undefined),
      )
        .focusable(false)
        .width(Math.min(4, Math.max(0, width - 1))),
    path.flatMap((node, index) => [
      index > 0 && text(" / ").color(debugColors.muted).width(3).shrink(0),
      button(
        text(node.element.data.call?.name || node.element.data.kind)
          .wrap("none")
          .overflow("ellipsis")
          .width("fill"),
        () => model.select(node),
      )
        .focusable(false)
        .width(
          Math.min(
            columns(node.element.data.call?.name || node.element.data.kind),
            Math.max(1, width - (hidden ? 4 : 0)),
          ),
        )
        .shrink(1)
        .minWidth(1)
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
