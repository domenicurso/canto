import type { PointerEvent } from "../element/events";
import type { Mounted } from "./tree";

/** Terminal mouse reports have no click count, so count nearby presses locally. */
export class PointerClicks {
  private previous?: {
    node: Mounted;
    x: number;
    y: number;
    time: number;
    count: number;
  };
  press(node: Mounted, event: PointerEvent, time = performance.now()): number {
    const previous = this.previous;
    const repeated =
      previous &&
      previous.node === node &&
      time - previous.time <= 400 &&
      Math.abs(event.x - previous.x) <= 1 &&
      event.y === previous.y;
    const count = event.clicks ?? (repeated ? (previous.count % 3) + 1 : 1);
    this.previous = { node, x: event.x, y: event.y, time, count };
    return count;
  }
  move(event: PointerEvent): void {
    const previous = this.previous;
    if (
      previous &&
      (Math.abs(event.x - previous.x) > 1 || event.y !== previous.y)
    )
      this.clear();
  }
  clear(): void {
    this.previous = undefined;
  }
}
