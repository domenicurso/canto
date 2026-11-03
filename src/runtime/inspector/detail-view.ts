import type { DetailTab } from "./properties";
import type { DebugSelection } from "./selection";

import { column, row, scroll, text } from "../../element/factories";
import { component } from "../../element/node";
import { BoxModel } from "./box-model";
import { debugButton, inspectorScrollStyle } from "./controls";
import { hasEdits, resetProperties } from "./edits";
import { propertyLines } from "./properties";
import { PropertyRow } from "./property-view";

interface DetailProps {
  model: DebugSelection;
  width: number;
  height: number;
}

const tabs: DetailTab[] = ["Layout", "Styles", "Props", "State"];
export const InspectorDetails = component(function InspectorDetails({
  model,
  width,
  height,
}: DetailProps) {
  const tab = model.detailTab;
  const setTab = (value: DetailTab) => {
    model.detailTab = value;
    model.select(model.selected);
  };
  const node = model.selected;
  const identity = `${model.entries.find((entry) => entry.node === node)?.id ?? "none"}:${tab}`;
  return column(
    row(
      tabs.map((name) =>
        debugButton(name, () => setTab(name), tab === name).shrink(1),
      ),
      text("").width("fill"),
      node &&
        hasEdits(node) &&
        debugButton("Reset", () => {
          resetProperties(node);
          model.select(node);
        }),
    )
      .height(1)
      .width("fill"),
    scroll(propertyContent(model, width, identity), { gutter: "auto" })
      .width("fill")
      .height(Math.max(0, height - 2))
      .key(identity)
      .use(inspectorScrollStyle()),
  )
    .gap(1)
    .height(height)
    .width("fill");
});

function propertyContent(
  model: DebugSelection,
  width: number,
  identity: string,
) {
  const node = model.selected;
  let section = "";
  const rows = node
    ? propertyLines(node, model.detailTab).map((line, index) => {
        if (line.section) section = line.label;
        const key = `${identity}:${section}:${line.label}`;
        return line.box
          ? BoxModel({
              node,
              width: width - 2,
              changed: () => model.select(node),
            }).key(key)
          : PropertyRow({
              node,
              line,
              width: width - 2,
              first: index === 0,
              changed: () => model.select(node),
            }).key(key);
      })
    : text("No selection");
  return column(rows).width("fill").padding([0, 1]);
}
