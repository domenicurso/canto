import type { DebugReadings } from "../sampling";

import {
  button,
  column,
  input,
  row,
  scroll,
  text,
} from "../../../element/factories";
import { component } from "../../../element/node";
import { useState } from "../../components/hooks";

export type FixtureScene = "Sample" | "Long tree" | "Values" | "Empty";
export const scenes: FixtureScene[] = [
  "Sample",
  "Long tree",
  "Values",
  "Empty",
];

const Card = component(function FixtureCard() {
  const [state] = useState({
    count: 3,
    enabled: true,
    tags: ["layout", "inspector"],
    optional: null,
  });
  return column(
    text("Inspector sample").bold(),
    text(`Count: ${state.count}`),
    row(
      button("Apply", () => {}),
      button("Disabled", { disabled: true, onPress: () => {} }),
    ).gap(2),
    input({
      defaultValue: "Editable appearance",
      readOnly: true,
      placeholder: "Search",
    }),
  )
    .key("fixture-card")
    .width(34)
    .padding([1, 2])
    .gap(1)
    .border("single")
    .borderColor("#777777")
    .background("#252525")
    .color("#dedede");
});

export function sampleScene(scene: FixtureScene) {
  return scroll(
    column(
      Card(),
      scene === "Values" &&
        text(
          'A long value with "quotes", \\escapes, Unicode: café 東京, and enough content to wrap across narrow panels. '.repeat(
            5,
          ),
        )
          .width(60)
          .wrap("word"),
      Array.from({ length: scene === "Long tree" ? 200 : 8 }, (_, index) =>
        row(
          text(`Item ${index}`).width(12),
          text(index % 2 ? "Ready" : "Pending"),
        )
          .gap(2)
          .key(`item-${index}`),
      ),
    ),
    { gutter: "auto" },
  )
    .fill()
    .padding(1)
    .background("#141414")
    .color("#bdbdbd");
}

const frame = {
  frame: 42,
  fps: 60,
  cellsWritten: 180,
  renderTime: 1.8,
  contentTime: 1.1,
  updateTime: 0.2,
  layoutTime: 0.3,
  prepareTime: 0.4,
  paintTime: 0.4,
  diffTime: 0.1,
  layoutNodes: 24,
  paintedCells: 320,
  contentCellsWritten: 120,
  debugTime: 0.3,
  presentTime: 0.4,
  intervalTime: 16.7,
  encodeTime: 0.1,
  writeTime: 0.2,
  outputBytes: 640,
};
export const sampleReadings: DebugReadings = {
  fps: 60,
  content: frame,
  completed: frame,
};
