import type { Element } from "../../element/node";
import type { Screen } from "../../render/screen";
import type { Reading } from "./readings";
import type { DebugReadings } from "./sampling";
import type { DebugSelection } from "./selection";

import { column, row, text } from "../../element/factories";
import { debugColors } from "./controls";
import { debugReadings } from "./readings";

export function InspectorStats(props: {
  stats: DebugReadings;
  screen: Screen;
  width: number;
  model: DebugSelection;
}): Element {
  const readings = debugReadings(props.stats, props.screen);
  const wide = props.width - 4 >= 46;
  const left = column(
    readings.left.map((pair) => metric(pair, props.model)),
  ).width(wide ? Math.floor((props.width - 7) / 2) : "fill");
  const right = column(
    readings.right.map((pair) => metric(pair, props.model)),
  ).width("fill");
  return column(
    readings.header.map((pair) => metric(pair, props.model)),
    text("").height(1),
    wide
      ? row(left, right).gap(3).width("fill")
      : column(left, right).width("fill"),
  )
    .padding([0, 2])
    .width("fill");
}

function metric(pair: Reading, model: DebugSelection): Element {
  const label = pair[0].trimStart();
  return row(
    text(" ".repeat(pair[0].length - label.length)),
    text(label)
      .wrap("none")
      .overflow("ellipsis")
      .color(debugColors.muted)
      .key(pair[2] ? `metric:${pair[2]}` : "label")
      .onMouse((event) => {
        if (event.action !== "move" || !pair[2] || model.help?.text === pair[2])
          return;
        model.help = { text: pair[2], x: event.x, y: event.y };
      }),
    text("").width("fill").minWidth(0),
    text(pair[1]).wrap("none").color(debugColors.text),
  )
    .height(1)
    .width("fill");
}
