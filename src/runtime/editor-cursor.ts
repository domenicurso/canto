import type { Screen } from "../render/screen";
import type { Mounted, Rect } from "./tree";

import { contains } from "../layout/geometry";
import { editorView } from "./editor-view";

export function cursorOutput(
  focused: Mounted | undefined,
  screen: Screen,
  occlusion?: Readonly<Rect>,
): string {
  if (!focused?.element.data.props.input) return "\x1b[?25l";
  const cursor = editorView(focused).cursor;
  cursor.x = Math.min(focused.inner.x + focused.inner.width - 1, cursor.x);
  if (occlusion && contains(occlusion, cursor.x, cursor.y)) return "\x1b[?25l";
  if (
    !contains(
      { x: 0, y: 0, width: screen.width, height: screen.height },
      cursor.x,
      cursor.y,
    )
  )
    return "\x1b[?25l";
  let parent = focused.parent;
  while (parent) {
    if (
      parent.style.overflow !== "visible" &&
      !contains(parent.inner, cursor.x, cursor.y)
    )
      return "\x1b[?25l";
    parent = parent.parent;
  }
  return `\x1b[${cursor.y + 1};${cursor.x + 1}H\x1b[?25h`;
}
