import type { KeyEvent, PointerEvent } from "../element/events";
import type { Screen } from "../render/screen";
import type { ContentFrameStats, FrameStats } from "./frame-stats";
import type { Rect } from "./tree";

import { contains } from "../layout/geometry";
import { paintDebugPanel } from "./debug-paint";
import { DebugSampling } from "./debug-sampling";
import { DebugTooltip } from "./debug-tooltip";

export interface DebugControl {
  readonly visible: boolean;
  setVisible(visible: boolean): void;
  toggle(): void;
}
/** Diagnostics consume the current content snapshot without entering the app's tree. */
export class DebugPanel implements DebugControl {
  private readonly tooltip = new DebugTooltip();
  private sampling = new DebugSampling();
  private shown = false;
  private presented?: Rect;
  private pressed = false;
  constructor(
    private readonly shortcuts: boolean,
    private readonly changed: () => void,
  ) {}
  get rect(): Readonly<Rect> | undefined {
    return this.shown ? this.presented : undefined;
  }
  get visible(): boolean {
    return this.shown;
  }
  setVisible(visible: boolean): void {
    if (this.shown === visible) return;
    this.shown = visible;
    this.tooltip.clear();
    if (visible) this.sampling = new DebugSampling();
    this.changed();
  }
  toggle(): void {
    this.setVisible(!this.shown);
  }
  key(event: KeyEvent): boolean {
    if (event.ctrl || event.alt || event.meta || event.shift) return false;
    if (event.key === "escape" && this.shown) this.setVisible(false);
    else if (event.key === "f3" && this.shortcuts) this.toggle();
    else return false;
    event.preventDefault();
    return true;
  }
  mouse(event: PointerEvent): boolean {
    if (this.shown && this.tooltip.move(event)) this.changed();
    const rect = this.presented;
    const captured =
      this.pressed && (event.action === "move" || event.action === "release");
    if (
      !captured &&
      (!this.shown || !rect || !contains(rect, event.x, event.y))
    )
      return false;
    if (event.action === "press" && event.button === 0) this.pressed = true;
    if (event.action === "release") this.pressed = false;
    if (
      event.action === "press" &&
      event.button === 0 &&
      rect &&
      event.y === rect.y &&
      event.x >= rect.x + rect.width - 4
    )
      this.setVisible(false);
    return true;
  }
  compose(
    content: Screen,
    stats: ContentFrameStats,
    previous: FrameStats,
  ): Screen {
    if (!this.shown) {
      this.presented = undefined;
      return content;
    }
    const rect = this.bounds(content);
    this.presented = rect;
    return paintDebugPanel(
      content,
      this.sampling.read(stats, previous, performance.now()),
      rect,
      this.tooltip,
    );
  }
  private bounds(screen: Screen): Rect {
    const width = Math.min(60, screen.width);
    const height = Math.min(14, screen.height);
    return {
      x: screen.width - width,
      y: screen.height - height,
      width,
      height,
    };
  }
}
