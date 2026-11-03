import type { KeyEvent, PointerEvent } from "../../element/events";
import type { Rect } from "../../layout/geometry";
import type { Screen } from "../../render/screen";
import type { Terminal } from "../../terminal/transport";
import type { Mounted } from "../components/tree";
import type { ContentFrameStats, FrameStats } from "../frame-stats";
import type { DebugControl, DebugPlacement, DebugView } from "./chrome";

import { contains } from "../../layout/geometry";
import { debugBounds, debugShortcut, sidebarWidth } from "./chrome";
import { InspectorHost } from "./host";
import { InspectorPresentation } from "./presentation";
import { DebugSelection } from "./selection";
export class DebugPanel implements DebugControl {
  private readonly model: DebugSelection;
  private readonly changed: (layoutChanged?: boolean) => void;
  private presentation?: InspectorPresentation;
  private host?: InspectorHost;
  private shown = false;
  private presented?: Rect;
  private pressed = false;
  private tab: DebugView["tab"] = "stats";
  private position: DebugPlacement = "overlay";
  constructor(
    private readonly shortcuts: boolean,
    changed: (layoutChanged?: boolean) => void,
  ) {
    this.changed = (layoutChanged) => {
      this.host?.invalidate();
      changed(layoutChanged);
    };
    this.model = new DebugSelection(() => this.changed());
  }
  attach(terminal: Terminal): void {
    this.host = new InspectorHost(terminal, this, () => this.changed());
    this.presentation = new InspectorPresentation(this.host, this.model, {
      tab: (tab) => {
        this.tab = tab;
        this.model.picking = false;
        this.model.help = undefined;
        this.changed();
      },
      pick: () => this.setPicking(!this.picking),
      placement: () =>
        this.setPlacement(this.position === "overlay" ? "sidebar" : "overlay"),
      close: () => this.setVisible(false),
    });
  }
  get cursor(): string | undefined {
    return this.shown ? this.host?.cursor : undefined;
  }
  get rect(): Readonly<Rect> | undefined {
    return this.picking
      ? this.model.root?.layout.rect
      : this.shown
        ? this.presented
        : undefined;
  }
  get visible(): boolean {
    return this.shown;
  }
  get picking(): boolean {
    return this.shown && this.model.picking;
  }
  get placement(): DebugPlacement {
    return this.position;
  }
  reservedWidth(width: number): number {
    return this.shown && this.position === "sidebar" ? sidebarWidth(width) : 0;
  }
  setPlacement(placement: DebugPlacement): void {
    if (placement !== "overlay" && placement !== "sidebar")
      throw new Error("Inspector placement must be overlay or sidebar.");
    if (this.position === placement) return;
    this.position = placement;
    this.changed(this.shown);
  }
  setPicking(picking: boolean): void {
    if (picking) {
      this.setVisible(true);
      this.tab = "elements";
    }
    this.model.picking = picking;
    this.changed();
  }
  setVisible(visible: boolean): void {
    if (this.shown === visible) return;
    this.shown = visible;
    this.model.help = undefined;
    if (!visible) {
      this.model.picking = false;
      this.host?.clear();
    }
    if (visible) this.presentation?.reset();
    this.changed(this.position === "sidebar");
  }
  toggle(): void {
    this.setVisible(!this.shown);
  }
  key(event: KeyEvent): boolean {
    if (this.shown && this.host?.editing) return this.host.key(event);
    const action = debugShortcut(event, this.shortcuts);
    if (action === "pick") this.setPicking(!this.picking);
    else if (action === "toggle") this.toggle();
    else if (action === "escape" && this.picking) this.setPicking(false);
    else if (action === "escape" && this.shown) this.setVisible(false);
    else if (
      action !== "navigate" ||
      !this.shown ||
      this.tab !== "elements" ||
      !this.host?.key(event)
    )
      return false;
    event.preventDefault();
    return true;
  }
  mouse(event: PointerEvent): boolean {
    const rect = this.presented;
    if (this.picking && (!rect || !contains(rect, event.x, event.y))) {
      this.model.pick(event);
      if (event.action === "press" && event.button === 0) this.pressed = true;
      return true;
    }
    const captured =
      this.pressed && (event.action === "move" || event.action === "release");
    if (
      !captured &&
      (!this.shown ||
        (!this.host?.modal && (!rect || !contains(rect, event.x, event.y))))
    ) {
      this.host?.outside(event);
      this.model.hover(undefined);
      if (this.model.help) {
        this.model.help = undefined;
        this.changed();
      }
      return false;
    }
    if (event.action === "press" && event.button === 0) this.pressed = true;
    if (event.action === "release") this.pressed = false;
    const key = this.host?.mouse(
      event,
      this.tab === "stats" && event.y > (rect?.y ?? Infinity),
    );
    if (
      this.tab === "stats" &&
      this.model.help &&
      (typeof key !== "string" || !key.startsWith("metric:"))
    ) {
      this.model.help = undefined;
      this.changed();
    }
    return true;
  }
  compose(
    content: Screen,
    stats: ContentFrameStats,
    previous: FrameStats,
    root: Mounted,
  ): Screen {
    if (!this.shown) {
      this.presented = undefined;
      return content;
    }
    if (!this.presentation)
      throw new Error("The inspector has no terminal session.");
    const view: DebugView = {
      tab: this.tab,
      picking: this.picking,
      placement: this.position,
    };
    this.presented = debugBounds(content, view);
    return this.presentation.compose({ content, stats, previous, root, view });
  }

  commit(): void {
    if (this.shown) this.host?.commit();
  }
  dispose(): void {
    this.host?.dispose();
  }
}
