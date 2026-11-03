import type { Element } from "../../element/node";

import { button, text } from "../../element/factories";
import { style } from "../../style/builders/builder";

export const debugColors = {
  background: "#1c1c1c",
  surface: "#242424",
  active: "#383838",
  text: "#dedede",
  muted: "#909090",
  line: "#414141",
  help: "#343434",
  name: "#a9bdce",
  string: "#b6c59b",
  number: "#c6aece",
  literal: "#cfb38d",
};

export function debugButton(
  label: string,
  run: () => void,
  active = false,
): Element {
  return button(text(label).wrap("none"), run)
    .height(1)
    .padding([0, 1])
    .focusable(false)
    .color(active ? debugColors.text : debugColors.muted)
    .background(active ? debugColors.active : debugColors.background)
    .hovered(style().background(debugColors.surface).color(debugColors.text))
    .pressed(style().background(debugColors.active));
}

export function inspectorScrollStyle() {
  return style()
    .scrollbarTrack(style().color(debugColors.background))
    .scrollbarThumb(
      style()
        .color(debugColors.background)
        .hovered(style().color(debugColors.muted)),
    );
}
