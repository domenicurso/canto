import type { KeyEvent, PointerEvent } from "../element/events";
import type { CellSize } from "../terminal/cell-size";
import type { Clipboard } from "../terminal/clipboard";
import type { Terminal } from "../terminal/transport";
import type { SelectionMode } from "./selection-mode";
import type { Mounted } from "./tree";

import { ClipboardInput } from "./clipboard";
import { Focus, hit, keyboardRoot } from "./focus";
import { defaultKey } from "./keyboard-defaults";
import { OverlayInput } from "./overlay-input";
import { PointerState } from "./pointer";
import { ScrollDrag } from "./scroll-drag";
import { ScrollInput } from "./scroll-input";
import { SelectionModes } from "./selection-mode";
import { walk } from "./tree";
import { WheelInput } from "./wheel-input";

export class InputRouter {
  readonly focus: Focus;
  private readonly pointer: PointerState;
  private readonly overlays: OverlayInput;
  get selection() {
    return this.pointer.selection;
  }
  readonly selectionModes: SelectionModes;
  private readonly drag = new ScrollDrag();
  private readonly clipboard: ClipboardInput;
  private readonly scrolling: ScrollInput;
  private readonly wheels: WheelInput;
  constructor(
    private readonly schedule: () => void,
    cellSize: () => CellSize | undefined,
    access: {
      clipboard: () => Clipboard;
      fail: (error: unknown) => void;
      terminal: () => Terminal;
      selection: () => SelectionMode;
    },
  ) {
    this.focus = new Focus(schedule);
    this.overlays = new OverlayInput(this.focus);
    this.pointer = new PointerState(this.focus);
    this.selectionModes = new SelectionModes(
      access.terminal,
      access.selection,
      () => {
        this.resetPointer();
        schedule();
      },
    );
    this.clipboard = new ClipboardInput({
      ...access,
      selection: this.selection,
      schedule,
    });
    this.scrolling = new ScrollInput(schedule, cellSize);
    this.wheels = new WheelInput(schedule);
  }
  refresh(root: Mounted): void {
    this.overlays.refresh(root);
    this.focus.refresh(root);
  }
  key(root: Mounted, event: KeyEvent): void {
    if (this.overlays.key(event)) {
      this.schedule();
      return;
    }
    let clipboardHandled = false;
    let node = this.focus.current ?? keyboardRoot(root);
    while (node) {
      node.element.data.props.onKey?.(event);
      if (
        !event.defaultPrevented &&
        this.clipboard.key(this.focus.current, event)
      ) {
        clipboardHandled = true;
        event.preventDefault();
      }
      if (!event.defaultPrevented && defaultKey(node, event, this.scrolling))
        event.preventDefault();
      if (event.propagationStopped) break;
      if (!node.parent || node === this.focus.scope) break;
      node = node.parent;
    }
    if (!clipboardHandled) this.selection.clear();
    if (!event.defaultPrevented && event.key === "tab")
      this.focus.next(root, event.shift);
    this.schedule();
  }
  flushScroll(root: Mounted): void {
    this.scrolling.advance();
    for (const [node, event] of this.wheels.drain(root))
      this.scrolling.wheel(node, event);
  }
  dispose(): void {
    this.selectionModes.stop();
    this.clipboard.dispose();
    this.drag.clear();
    this.pointer.clear();
    this.wheels.dispose();
    this.scrolling.dispose();
  }
  resetPointer(): void {
    this.pointer.clear();
    this.drag.clear();
    this.wheels.dispose();
    this.scrolling.interrupt();
  }
  mouse(root: Mounted, event: PointerEvent): void {
    if (this.selectionModes.control.mode === "native") return;
    if (this.overlays.mouse(event)) {
      this.resetPointer();
      this.schedule();
      return;
    }
    if (event.action === "scroll") {
      this.selection.clear();
      this.wheels.push(this.scrolling.normalize(event));
      return;
    }
    if (
      event.action !== "press" &&
      (this.drag.move(event) || this.selection.move(event))
    ) {
      this.schedule();
      if (event.action === "release") this.pointer.release(undefined);
      return;
    }
    if (event.action === "press") {
      this.wheels.dispose();
      this.scrolling.interrupt();
    }
    const target = hit(root, event, root.rect);
    const captured =
      event.action === "press" ? this.drag.press(target, event) : undefined;
    if (captured) {
      this.focus.set(captured);
      this.selection.clear();
      this.schedule();
      return;
    }
    if (event.action === "press") this.pointer.select(target, event);
    const changed = this.pointer.hover(target);
    this.notifyPointer(target, event);
    if (event.action === "release") this.pointer.release(target);
    if (changed || event.action !== "move") this.schedule();
  }
  private notifyPointer(
    target: Mounted | undefined,
    event: PointerEvent,
  ): void {
    for (let node = target; node; node = node.parent ?? undefined) {
      const handler = node.element.data.props.onMouse;
      if (handler) {
        handler(event);
      }
      if (
        event.action === "press" &&
        (node.element.data.props.button || node.element.data.props.input)
      ) {
        this.pointer.press(node, event);
        break;
      }
    }
  }
  outside(event: PointerEvent): void {
    if (this.selectionModes.control.mode === "native") return;
    const changed = this.pointer.hover(undefined);
    const captured =
      (event.action === "move" || event.action === "release") &&
      (this.drag.move(event) || this.selection.move(event));
    if (event.action === "release") this.pointer.release(undefined);
    if (changed || captured || event.action !== "move") this.schedule();
  }
  resize(root: Mounted): void {
    this.selection.clear();
    for (const node of walk(root))
      if (node.element.data.kind === "component") node.dirty = true;
  }
}
