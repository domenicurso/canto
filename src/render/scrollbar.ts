import type { Mounted, Rect } from "../runtime/tree";
import type { Style } from "../style/types";
import type { Screen } from "./screen";

const leftBlocks = " ▏▎▍▌▋▊▉█";
const lowerBlocks = " ▁▂▃▄▅▆▇█";

export function scrollbar(node: Mounted, screen: Screen, clip: Rect): void {
  const props = node.element.data.props.scroll;
  if (props?.scrollbar === "hidden") return;
  const stable = props?.gutter === "stable" || props?.scrollbar === "visible";
  if (props?.axis !== "horizontal" && (node.maxOffset || stable))
    drawBar({ node, screen, clip, horizontal: false });
  if (props?.axis !== undefined && props.axis !== "vertical" && (node.maxOffsetX || stable))
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
  const length = horizontal ? node.inner.width : node.inner.height;
  const maximum = horizontal ? node.maxOffsetX : node.maxOffset;
  const offset = horizontal ? node.offsetX : node.offset;
  const units = length * 8;
  const thumb = Math.min(
    units,
    Math.max(8, Math.round((units * length) / Math.max(1, length + maximum))),
  );
  const start = maximum ? Math.round((offset / maximum) * (units - thumb)) : 0;
  for (let index = 0; index < length; index++) {
    const from = Math.max(0, start - index * 8);
    const to = Math.min(8, start + thumb - index * 8);
    const cell = thumbCell({ from, to, horizontal, style: node.style });
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
}: {
  from: number;
  to: number;
  horizontal: boolean;
  style: Style;
}): { text: string; style: Style } {
  const coverage = Math.max(0, to - from);
  const thumb = style.foreground ?? "#cbd5e1";
  const track = style.background ?? "#4b5563";
  // Unicode has left and lower eighth blocks; swap the two colors for the opposite edge.
  const inverted = coverage > 0 && coverage < 8 && (horizontal ? from > 0 : from === 0);
  const glyph = inverted ? 8 - coverage : coverage;
  return {
    text: (horizontal ? leftBlocks : lowerBlocks)[glyph] ?? " ",
    style: { ...style, foreground: inverted ? track : thumb, background: inverted ? thumb : track },
  };
}
