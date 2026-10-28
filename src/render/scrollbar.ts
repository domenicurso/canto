import type { Mounted, Rect } from "../runtime/tree";
import type { Style } from "../style/types";
import type { Screen } from "./screen";

import { barGeometry } from "../layout/scrollbar";
import { partStyle } from "../layout/style-parts";

const leftBlocks = " ▏▎▍▌▋▊▉█";
const lowerBlocks = " ▁▂▃▄▅▆▇█";

export function scrollbar(node: Mounted, screen: Screen, clip: Rect): void {
  const props = node.element.data.props.scroll;
  if (props?.scrollbar === "hidden") return;
  const stable = props?.gutter === "stable" || props?.scrollbar === "visible";
  if (props?.axis !== "horizontal" && (node.maxOffset || stable))
    drawBar({ node, screen, clip, horizontal: false });
  if (
    props?.axis !== undefined &&
    props.axis !== "vertical" &&
    (node.maxOffsetX || stable)
  )
    drawBar({ node, screen, clip, horizontal: true });
}
function drawBar({
  node,
  screen,
  clip,
  horizontal,
}: {
  node: Mounted;
  screen: Screen;
  clip: Rect;
  horizontal: boolean;
}): void {
  const bar = barGeometry(node, horizontal);
  const { length } = bar;
  const thumb = bar.thumb * 8;
  const start = bar.start * 8;
  const thumbStyle = partStyle(node, "scrollbarThumb");
  const trackStyle = partStyle(node, "scrollbarTrack");
  for (let index = 0; index < length; index++) {
    const from = Math.max(0, start - index * 8);
    const to = Math.min(8, start + thumb - index * 8);
    const cell = thumbCell({
      from,
      to,
      horizontal,
      style: node.style,
      thumb: thumbStyle,
      track: trackStyle,
    });
    screen.put(
      {
        x: node.inner.x + (horizontal ? index : node.inner.width),
        y: node.inner.y + (horizontal ? node.inner.height : index),
        width: 1,
        height: 1,
      },
      cell.text,
      cell.style,
      clip,
    );
  }
}
function thumbCell({
  from,
  to,
  horizontal,
  style,
  thumb: thumbStyle,
  track: trackStyle,
}: {
  from: number;
  to: number;
  horizontal: boolean;
  style: Style;
  thumb: Style;
  track: Style;
}): { text: string; style: Style } {
  const coverage = Math.max(0, to - from);
  const thumb =
    thumbStyle.foreground !== undefined
      ? thumbStyle.foreground
      : (style.foreground ?? "#cbd5e1");
  const track =
    trackStyle.foreground !== undefined
      ? trackStyle.foreground
      : (style.background ?? "#4b5563");
  // Unicode has left and lower eighth blocks; swap the two colors for the opposite edge.
  const inverted =
    coverage > 0 && coverage < 8 && (horizontal ? from > 0 : from === 0);
  const glyph = inverted ? 8 - coverage : coverage;
  return {
    text: (horizontal ? leftBlocks : lowerBlocks)[glyph] ?? " ",
    style: {
      ...style,
      ...(coverage ? thumbStyle : trackStyle),
      foreground: inverted ? track : thumb,
      background: inverted ? thumb : track,
    },
  };
}
