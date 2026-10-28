import type { KeyEvent, PointerEvent } from "../element/events";
import type { CellSize } from "../terminal/cell-size";
import type { Clipboard } from "../terminal/clipboard";
import type { Terminal } from "../terminal/transport";
import type { SelectionMode } from "./selection-mode";
import type { Mounted } from "./tree";

import { ClipboardInput } from "./clipboard";
import { edit } from "./editing";
import { disabled, Focus, hit, keyboardRoot } from "./focus";
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
      if (!event.defaultPrevented && this.defaultKey(node, event))
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
  private defaultKey(node: Mounted, event: KeyEvent): boolean {
    if (disabled(node)) return false;
    if (node.element.data.props.input) return edit(node, event);
    if (node.element.data.props.button && ["enter", " "].includes(event.key)) {
      node.element.data.props.button.onPress();
      return true;
    }
    if (node.element.data.kind === "scroll")
      return this.scrolling.key(node, event);
    return false;
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
    this.pointer.hover(target);
    let node = target;
    while (node) {
      node.element.data.props.onMouse?.(event);
      if (
        event.action === "press" &&
        (node.element.data.props.button || node.element.data.props.input)
      ) {
        this.pointer.press(node, event);
        break;
      }
      node = node.parent ?? undefined;
    }
    if (event.action === "release") this.pointer.release(target);
    this.schedule();
  }
  resize(root: Mounted): void {
    this.selection.clear();
    for (const node of walk(root))
      if (node.element.data.kind === "component") node.dirty = true;
  }
}
