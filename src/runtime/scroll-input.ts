import type { KeyEvent, PointerEvent } from "../element/events";
import type { ScrollPosition } from "../element/props";
import type { CellSize } from "../terminal/cell-size";
import type { Mounted } from "./tree";

import { setScroll } from "./focus";
import { ScrollPhysics } from "./scroll-physics";

interface PositionRequest {
  frame: number;
  position: ScrollPosition;
}
export class ScrollInput {
  private frame = 0;
  private readonly requests = new WeakMap<Mounted, PositionRequest>();
  private readonly physics: ScrollPhysics;
  constructor(
    schedule: () => void,
    private readonly cellSize: () => CellSize | undefined,
  ) {
    this.physics = new ScrollPhysics(schedule, this.move);
  }
  interrupt(): void {
    this.physics.dispose();
  }
  key(node: Mounted, event: KeyEvent): boolean {
    this.interrupt();
    const axis = node.element.data.props.scroll?.axis ?? "vertical";
    const horizontal = axis === "horizontal";
    const page = horizontal ? node.inner.width : node.inner.height;
    const amount =
      event.key === "pageup" ? -page : event.key === "pagedown" ? page : 0;
    const dx =
      event.key === "left"
        ? -1
        : event.key === "right"
          ? 1
          : horizontal
            ? amount
            : 0;
    const dy =
      event.key === "up"
        ? -1
        : event.key === "down"
          ? 1
          : horizontal
            ? 0
            : amount;
    if ((dx && axis !== "vertical") || (dy && !horizontal)) {
      this.move(node, {
        x: axis === "vertical" ? 0 : dx,
        y: horizontal ? 0 : dy,
      });
      return true;
    }
    return false;
  }
  normalize(event: PointerEvent): PointerEvent {
    if (event.deltaMode !== "pixel") return event;
    const cell = this.cellSize() ?? { width: 8, height: 16 };
    return {
      ...event,
      deltaMode: "cell",
      deltaX: (event.deltaX ?? 0) / cell.width,
      deltaY: event.deltaY / cell.height,
    };
  }
  wheel(node: Mounted, event: PointerEvent): void {
    const axis = node.element.data.props.scroll?.axis ?? "vertical";
    const cell = this.cellSize() ?? { width: 8, height: 16 };
    const delta = {
      x:
        axis === "horizontal"
          ? event.deltaX || (event.deltaY * cell.height) / cell.width
          : axis === "both"
            ? (event.deltaX ?? 0)
            : 0,
      y: axis === "horizontal" ? 0 : event.deltaY,
    };
    this.move(node, delta);
    this.physics.kick(node, delta);
  }
  advance(): void {
    this.frame++;
    this.physics.advance();
  }
  dispose(): void {
    this.physics.dispose();
  }
  private move = (node: Mounted, delta: ScrollPosition): void => {
    const previous = this.requests.get(node);
    const axis = node.element.data.props.scroll?.axis;
    const actual = {
      x: node.offsetX,
      y: axis === "horizontal" ? 0 : node.offset,
    };
    const pending =
      previous &&
      (previous.frame === this.frame ||
        (Math.floor(previous.position.x) === actual.x &&
          Math.floor(previous.position.y) === actual.y));
    const origin = pending ? previous.position : actual;
    const position = {
      x: Math.max(0, Math.min(node.maxOffsetX, origin.x + delta.x)),
      y: Math.max(0, Math.min(node.maxOffset, origin.y + delta.y)),
    };
    this.requests.set(node, { frame: this.frame, position });
    if (
      Math.floor(position.x) === actual.x &&
      Math.floor(position.y) === actual.y
    )
      return;
    const props = node.element.data.props.scroll;
    setScroll(
      node,
      props?.axis === "both"
        ? position
        : props?.axis === "horizontal"
          ? position.x
          : position.y,
    );
  };
}
