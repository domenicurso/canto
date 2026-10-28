import type { PointerEvent } from "../element/events";
import type { Mounted } from "./tree";

import { barGeometry } from "../layout/scrollbar";
import { setScroll } from "./focus";

export class ScrollDrag {
  private capture?: { node: Mounted; horizontal: boolean; grab: number };
  press(target: Mounted | undefined, event: PointerEvent): Mounted | undefined {
    if (event.button !== 0) return undefined;
    for (let node = target; node; node = node.parent ?? undefined) {
      if (node.element.data.kind !== "scroll") continue;
      for (const horizontal of [false, true]) {
        const bar = barGeometry(node, horizontal);
        const position = horizontal ? event.x - bar.x : event.y - bar.y;
        const cross = horizontal ? event.y === bar.y : event.x === bar.x;
        if (!bar.visible || !cross || position < 0 || position >= bar.length)
          continue;
        const onThumb =
          position + 1 > bar.start && position < bar.start + bar.thumb;
        this.capture = {
          node,
          horizontal,
          grab: onThumb ? position - bar.start : bar.thumb / 2,
        };
        this.move(event);
        return node;
      }
    }
    return undefined;
  }
  move(event: PointerEvent): boolean {
    const capture = this.capture;
    if (!capture) return false;
    const { node, horizontal, grab } = capture;
    if (!node.active) {
      this.capture = undefined;
      return false;
    }
    const bar = barGeometry(node, horizontal);
    if (!bar.visible) {
      this.capture = undefined;
      return false;
    }
    const position = horizontal ? event.x - bar.x : event.y - bar.y;
    const travel = bar.length - bar.thumb;
    const offset =
      travel > 0 ? Math.round(((position - grab) / travel) * bar.maximum) : 0;
    setScroll(
      node,
      node.element.data.props.scroll?.axis === "both"
        ? {
            x: horizontal ? offset : node.offsetX,
            y: horizontal ? node.offset : offset,
          }
        : offset,
    );
    if (event.action === "release") this.capture = undefined;
    return true;
  }
  clear(): void {
    this.capture = undefined;
  }
}
