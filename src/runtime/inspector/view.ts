import type { Rect } from "../../layout/geometry";
import type { Screen } from "../../render/screen";
import type { DebugView } from "./chrome";
import type { DebugReadings } from "./sampling";
import type { DebugSelection } from "./selection";

import { column, overlay, row, text } from "../../element/factories";
import { component } from "../../element/node";
import { width } from "../../text/columns";
import { breadcrumbs } from "./breadcrumbs";
import { debugButton, debugColors } from "./controls";
import { InspectorDetails } from "./detail-view";
import { boxDetails } from "./element-details";
import { InspectorStats } from "./stat-view";
import { InspectorTree } from "./tree-view";

export interface InspectorActions {
  tab(tab: DebugView["tab"]): void;
  pick(): void;
  placement(): void;
  close(): void;
}
export interface InspectorProps {
  model: DebugSelection;
  view: DebugView;
  rect: Rect;
  stats: DebugReadings;
  screen: Screen;
  actions: InspectorActions;
}

export const InspectorView = component((props: InspectorProps) => {
  const { rect, model, view } = props;
  const bodyHeight = Math.max(0, rect.height - 1);
  const body =
    view.tab === "stats"
      ? InspectorStats({ ...props, width: rect.width })
      : elementPanes(props);
  const help =
    model.picking && model.hovered
      ? boxDetails(model.hovered)
      : model.help
        ? [model.help.text]
        : [];
  const point = model.picking ? model.point : model.help;
  return column(
    column(header(props), column(body).height(bodyHeight).width("fill"))
      .position("absolute")
      .left(rect.x)
      .top(rect.y)
      .width(rect.width)
      .height(rect.height)
      .background(debugColors.background)
      .color(debugColors.text),
    help.length > 0 &&
      point &&
      overlay({
        content: column(
          help.map((line) => text(line).wrap("none").overflow("ellipsis")),
        )
          .padding([0, 1])
          .background(debugColors.help)
          .color(debugColors.text),
        anchor: () => ({ ...point, width: 1, height: 1 }),
        placement: "top-start",
        focus: "none",
      }).width(Math.min(props.screen.width, Math.max(...help.map(width)) + 2)),
  ).fill();
});

function header({ rect, view, actions }: InspectorProps) {
  const compact = rect.width < 40;
  return row(
    rect.width >= 60 && text(" Debug ").color(debugColors.muted),
    debugButton(
      compact ? "S" : "Stats",
      () => actions.tab("stats"),
      view.tab === "stats",
    ),
    debugButton(
      compact ? "E" : "Elements",
      () => actions.tab("elements"),
      view.tab === "elements",
    ),
    text("").width("fill").minWidth(0),
    debugButton(compact ? "P" : "Pick", actions.pick, view.picking),
    debugButton(
      compact ? "D" : view.placement === "sidebar" ? "Overlay" : "Sidebar",
      actions.placement,
    ),
    debugButton("x", actions.close),
  )
    .height(1)
    .width("fill");
}

function elementPanes({ rect, model }: InspectorProps) {
  const wide = rect.width >= 76;
  const height = Math.max(0, rect.height - 3);
  const treeWidth = wide ? Math.floor((rect.width - 3) * 0.35) : rect.width - 2;
  const treeHeight = wide
    ? height
    : Math.min(height, Math.max(3, Math.floor(height * 0.38)));
  const tree = InspectorTree({ model, height: treeHeight })
    .width(Math.max(0, treeWidth))
    .height(treeHeight);
  const details = InspectorDetails({
    model,
    width: Math.max(0, wide ? rect.width - treeWidth - 3 : rect.width - 2),
    height: Math.max(0, wide ? height : height - treeHeight - 1),
  })
    .width("fill")
    .height(wide ? height : Math.max(0, height - treeHeight - 1));
  return column(
    breadcrumbs(model),
    wide
      ? row(tree, details).gap(1).width("fill").height(height)
      : column(tree, details).gap(1).width("fill").height(height),
  )
    .padding([0, 1])
    .width("fill");
}
