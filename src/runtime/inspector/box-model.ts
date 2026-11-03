import type { Mounted } from "../components/tree";

import { column, row, text } from "../../element/factories";
import { padding } from "../../style/types";

export function boxModel(node: Mounted) {
  const { style, inner } = node.layout;
  const p = padding(style.padding);
  const values = [
    style.paddingTop ?? p[0],
    style.paddingRight ?? p[1],
    style.paddingBottom ?? p[2],
    style.paddingLeft ?? p[3],
  ];
  const border = style.border && style.border !== "none";
  const sides = [
    style.borderTop,
    style.borderRight,
    style.borderBottom,
    style.borderLeft,
  ].map((side) => (border && side !== false ? 1 : 0));
  const content = text(`${inner.width} x ${inner.height}`)
    .textAlign("center")
    .width("fill")
    .background("#34434c")
    .color("#c2d5df");
  const padded = ring("padding", values, content)
    .background("#354137")
    .color("#c4d0bc");
  return column(
    ring("border", sides, padded).background("#484233").color("#d8cdb1"),
    text(
      `gap  ${style.rowGap ?? style.gap ?? 0} row / ${style.columnGap ?? style.gap ?? 0} column`,
    ).color("#909090"),
  )
    .width("fill")
    .paddingBottom(1);
}

function ring(
  label: string,
  sides: number[],
  content: ReturnType<typeof text>,
) {
  return column(
    row(
      text(label).width("fill"),
      text(String(sides[0])).width("fill").textAlign("center"),
      text("").width("fill"),
    ),
    row(
      text(String(sides[3])).width(3).textAlign("center"),
      content.width("fill"),
      text(String(sides[1])).width(3).textAlign("center"),
    ),
    text(String(sides[2])).width("fill").textAlign("center"),
  ).width("fill");
}
