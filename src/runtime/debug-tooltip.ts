import type { PointerEvent } from "../element/events";
import type { Screen } from "../render/screen";
import type { Rect } from "./tree";

import { contains } from "../layout/geometry";
import { take, width } from "../text/columns";

interface MetricLabel {
  rect: Rect;
  help: string;
}
/** Label hit regions come from painted text, so clipping and column layout stay in sync. */
export class DebugTooltip {
  private labels: MetricLabel[] = [];
  private pointer?: { x: number; y: number };
  private active?: MetricLabel;
  clear(): void {
    this.labels = [];
    this.pointer = this.active = undefined;
  }
  begin(): void {
    this.labels = [];
  }
  label(rect: Rect, help: string): void {
    this.labels.push({ rect, help });
  }
  move(event: PointerEvent): boolean {
    this.pointer = { x: event.x, y: event.y };
    const next = this.hit();
    const changed =
      next?.help !== this.active?.help ||
      next?.rect.x !== this.active?.rect.x ||
      next?.rect.y !== this.active?.rect.y;
    this.active = next;
    return changed;
  }
  paint(screen: Screen): void {
    this.active = this.hit();
    if (!this.active) return;
    const padding = screen.width >= 2 ? 1 : 0;
    const text = take(
      this.active.help,
      Math.max(0, screen.width - padding * 2),
    );
    const size = width(text) + padding * 2;
    const rect = {
      x: Math.max(0, Math.min(this.active.rect.x, screen.width - size)),
      y:
        this.active.rect.y > 0
          ? this.active.rect.y - 1
          : Math.min(1, screen.height - 1),
      width: size,
      height: 1,
    };
    screen.put(
      rect,
      " ".repeat(padding) + text + " ".repeat(padding),
      { foreground: "#f8fafc", background: "#334155" },
      rect,
    );
  }
  private hit(): MetricLabel | undefined {
    const pointer = this.pointer;
    return (
      pointer &&
      this.labels.find((label) => contains(label.rect, pointer.x, pointer.y))
    );
  }
}
