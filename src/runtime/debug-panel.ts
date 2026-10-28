import type { KeyEvent, PointerEvent } from "../element/events";
import type { Screen } from "../render/screen";
import type { FrameStats } from "./frame-stats";
import type { Rect } from "./tree";

import { contains } from "../layout/geometry";
import { paintDebugPanel } from "./debug-paint";
import { DebugSampling } from "./debug-sampling";

export interface DebugControl {
  readonly visible: boolean;
  setVisible(visible: boolean): void;
  toggle(): void;
}
/** Diagnostics consume the current content snapshot without entering the app's tree. */
export class DebugPanel implements DebugControl {
  private readonly sampling = new DebugSampling();
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
  compose(content: Screen, previous: FrameStats): Screen {
    if (!this.shown) {
      this.presented = undefined;
      return content;
    }
    const rect = this.bounds(content);
    this.presented = rect;
    return paintDebugPanel(
      content,
      this.sampling.read(previous, performance.now()),
      rect,
    );
  }
  private bounds(screen: Screen): Rect {
    const marginX = screen.width > 2 ? 1 : 0;
    const marginY = screen.height > 2 ? 1 : 0;
    const width = Math.min(60, screen.width - 2 * marginX);
    const height = Math.min(14, screen.height - 2 * marginY);
    return {
      x: screen.width - width - marginX,
      y: screen.height - height - marginY,
      width,
      height,
    };
  }
}
