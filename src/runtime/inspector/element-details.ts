import type { Mounted } from "../components/tree";

import { padding } from "../../style/types";

export function elementName(node: Mounted): string {
  const { kind, call, key, text } = node.element.data;
  const name = call?.name || kind;
  const suffix = key === undefined ? "" : ` key=${JSON.stringify(key)}`;
  return name + suffix + (text ? ` ${JSON.stringify(text)}` : "");
}

export function boxDetails(node: Mounted): string[] {
  const { rect, style, inner } = node.layout;
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
  ];
  return [
    `${elementName(node)}${node.interaction.focused ? " [focused]" : ""}`,
    `Box ${rect.width}×${rect.height} at ${rect.x},${rect.y} · content ${inner.width}×${inner.height}`,
    `Padding ${values.join(" ")} · border ${sides.map((side) => (border && side !== false ? 1 : 0)).join(" ")} (T R B L)`,
    `Gap row ${style.rowGap ?? style.gap ?? 0} · column ${style.columnGap ?? style.gap ?? 0}`,
  ];
}
