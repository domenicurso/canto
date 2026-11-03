import type { InspectorEntry, DebugSelection } from "./selection";

import { Window } from "../../element/collections/list-window";
import { button, column, row, text } from "../../element/factories";
import { component } from "../../element/node";
import { style } from "../../style/builders/builder";
import { debugColors, inspectorScrollStyle } from "./controls";
import { elementName } from "./element-details";
import { syntaxText } from "./syntax";

export const InspectorTree = component(
  ({ model, height }: { model: DebugSelection; height: number }) => {
    const selected = model.entries.findIndex(
      (entry) => entry.node === model.selected,
    );
    return column(
      Window({
        dataset: model.entries,
        count: model.entries.length,
        heightIdentity: 1,
        height: Math.max(1, height - 1),
        itemHeight: 1,
        key: (index) => model.entries[index]?.id ?? index,
        activeIndex: selected,
        onActiveChange: (index) => model.select(model.entries[index]?.node),
        render: (index) => {
          const entry = model.entries[index];
          if (!entry)
            throw new Error("Inspector tree changed while rendering.");
          return treeRow(model, entry);
        },
        scrollStyle: inspectorScrollStyle(),
      }).key("inspector-tree"),
      text(`${model.entries.length} nodes`).color(debugColors.muted).height(1),
    )
      .height(height)
      .width("fill")
      .onKey((event) => model.navigate(event));
  },
);

function treeRow(model: DebugSelection, entry: InspectorEntry) {
  const { node, depth } = entry;
  const selected = model.selected === node;
  const background = selected ? debugColors.active : debugColors.background;
  const arrow = node.children.length
    ? model.collapsed.has(node)
      ? "+"
      : "-"
    : " ";
  const toggle = button(arrow, () => model.toggle(node))
    .width(2)
    .focusable(false);
  return row(
    text(" ".repeat(Math.min(depth * 2, 16))),
    toggle,
    button(
      text(
        text(node.element.data.call?.name || node.element.data.kind).color(
          debugColors.name,
        ),
        syntaxText(
          elementName(node).slice(
            (node.element.data.call?.name || node.element.data.kind).length,
          ),
        ),
      )
        .wrap("none")
        .overflow("ellipsis")
        .width("fill"),
      () => model.select(node),
    )
      .width("fill")
      .focusable(false),
  )
    .width("fill")
    .height(1)
    .background(background)
    .color(debugColors.text)
    .hovered(style().background(debugColors.surface))
    .onMouse((event) => {
      if (event.action === "move") model.hover(node);
    });
}
