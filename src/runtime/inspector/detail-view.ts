import type { DetailTab } from "./properties";
import type { DebugSelection } from "./selection";

import { column, row, scroll, text } from "../../element/factories";
import { component } from "../../element/node";
import { useState } from "../components/hooks";
import { boxModel } from "./box-model";
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
export const InspectorDetails = component(
  ({ model, width, height }: DetailProps) => {
    const [tab, setTab] = useState<DetailTab>("Layout");
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
      scroll(
        column(
          node
            ? propertyLines(node, tab).map((line, index) =>
                line.box
                  ? boxModel(node).key(index)
                  : PropertyRow({
                      node,
                      line,
                      width: width - 2,
                      changed: () => model.select(node),
                    }).key(`${identity}:${index}`),
              )
            : text("No selection"),
        )
          .width("fill")
          .padding([0, 1]),
        { gutter: "auto" },
      )
        .width("fill")
        .height(Math.max(0, height - 2))
        .key(identity)
        .use(inspectorScrollStyle()),
    )
      .gap(1)
      .height(height)
      .width("fill");
  },
);
