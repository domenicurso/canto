import type { PointerEvent } from "../element/events";
import type { Mounted } from "./tree";

import { hit } from "./focus";

/** Coalesce trackpad reports before hit testing and applying a frame's two-axis displacement. */
export class WheelInput {
  private readonly pending = new Map<string, PointerEvent>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  constructor(private readonly schedule: () => void) {}
  push(event: PointerEvent): void {
    const key = `${event.x}:${event.y}`;
    this.pending.set(key, combine(this.pending.get(key), event));
    this.timer ??= setTimeout(() => {
      this.timer = undefined;
      this.schedule();
    }, 8);
  }
  drain(root: Mounted): Map<Mounted, PointerEvent> {
    clearTimeout(this.timer);
    this.timer = undefined;
    const targets = new Map<Mounted, PointerEvent>();
    for (const event of this.pending.values()) {
      let node = hit(root, event, root.rect);
      while (node) {
        node.element.data.props.onMouse?.(event);
        if (node.element.data.kind === "scroll") {
          targets.set(node, combine(targets.get(node), event));
          break;
        }
        node = node.parent ?? undefined;
      }
    }
    this.pending.clear();
    return targets;
  }
  dispose(): void {
    clearTimeout(this.timer);
    this.pending.clear();
  }
}
function combine(
  previous: PointerEvent | undefined,
  event: PointerEvent,
): PointerEvent {
  return {
    ...event,
    deltaX: (previous?.deltaX ?? 0) + (event.deltaX ?? 0),
    deltaY: (previous?.deltaY ?? 0) + event.deltaY,
  };
}
