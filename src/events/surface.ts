import { Renderer } from "../renderer";
import { BaseNode, InputNode, ScrollableNode, TextareaNode } from "../widgets";
import { collectFocusableNodes } from "./focus";
import { isActivationKey } from "./keyboard";
import { isScrollEvent } from "./mouse";

import type { RenderOptions, RenderResult } from "../renderer";
import type { Node } from "../widgets";
import type {
  Event,
  KeyPressEvent,
  MouseEvent,
  ResizeEvent,
  TextInputEvent,
} from "./types";

export class Surface {
  readonly root: Node;
  readonly renderer: Renderer;
  private focusables: BaseNode[] = [];
  private focusedIndex = -1;
  private focused: BaseNode | null = null;

  constructor(root: Node, renderer: Renderer) {
    this.root = root;
    this.renderer = renderer;
    this.refreshFocusables();
  }

  refresh(): void {
    this.refreshFocusables();
  }

  get focusedNode(): Node | null {
    return this.focused;
  }

  dispatch(event: Event): boolean {
    switch (event.type) {
      case "KeyPress":
        return this.handleKeyPress(event);
      case "TextInput":
        return this.handleTextInput(event);
      case "Mouse":
        return this.handleMouse(event);
      case "Resize":
        return this.handleResize(event);
      default:
        return false;
    }
  }

  focus(node: Node): boolean {
    if (!(node instanceof BaseNode)) {
      return false;
    }
    if (!node.isFocusable()) {
      return false;
    }
    const index = this.focusables.indexOf(node);
    if (index === -1) {
      this.refreshFocusables();
      const refreshedIndex = this.focusables.indexOf(node);
      if (refreshedIndex === -1) {
        return false;
      }
      this.focusedIndex = refreshedIndex;
    } else {
      this.focusedIndex = index;
    }
    this.setFocusedNode(node);
    return true;
  }

  blur(): void {
    if (!this.focused) {
      return;
    }
    const current = this.focused;
    this.focused = null;
    this.focusedIndex = -1;
    current.blur();
  }

  focusNext(): boolean {
    if (this.focusables.length === 0) {
      return false;
    }
    const nextIndex = (this.focusedIndex + 1) % this.focusables.length;
    this.focusedIndex = nextIndex;
    const nextNode = this.focusables[nextIndex];
    if (nextNode) {
      this.setFocusedNode(nextNode);
    }
    return true;
  }

  focusPrevious(): boolean {
    if (this.focusables.length === 0) {
      return false;
    }
    const nextIndex =
      (this.focusedIndex - 1 + this.focusables.length) % this.focusables.length;
    this.focusedIndex = nextIndex;
    const nextNode = this.focusables[nextIndex];
    if (nextNode) {
      this.setFocusedNode(nextNode);
    }
    return true;
  }

  render(options?: RenderOptions): RenderResult {
    return this.renderer.render(this.root, options ?? { mode: "fullscreen" });
  }

  dispose(): void {
    if (this.focused) {
      this.focused.blur();
    }
    if (this.root instanceof BaseNode) {
      this.root.dispose();
    }
  }

  private setFocusedNode(node: BaseNode): void {
    if (this.focused === node) {
      return;
    }
    if (this.focused) {
      this.focused.blur();
    }
    this.focused = node;
    node.focus();
  }

  private refreshFocusables(): void {
    this.focusables = collectFocusableNodes(this.root);
    if (this.focusables.length === 0) {
      this.focusedIndex = -1;
      this.focused = null;
    } else if (this.focused) {
      const index = this.focusables.indexOf(this.focused);
      this.focusedIndex = index;
      if (index === -1) {
        this.focused = null;
      }
    }
  }

  private handleKeyPress(event: KeyPressEvent): boolean {
    const key = event.key.toLowerCase();
    if (key === "tab") {
      return event.shift ? this.focusPrevious() : this.focusNext();
    }
    if (key === "escape") {
      this.blur();
      return true;
    }
    const target = this.focused;
    if (!target) {
      return false;
    }

    if (target instanceof InputNode) {
      return this.handleInputKey(target, event);
    }
    if (target instanceof TextareaNode) {
      return this.handleTextareaKey(target, event);
    }
    if (isActivationKey(event)) {
      target.triggerSubmit();
      return true;
    }
    return false;
  }

  private handleTextInput(event: TextInputEvent): boolean {
    const target = this.focused;
    if (!target) {
      return false;
    }
    if (target instanceof InputNode) {
      target.insert(event.text);
      return true;
    }
    if (target instanceof TextareaNode) {
      target.insert(event.text);
      return true;
    }
    return false;
  }

  private handleMouse(event: MouseEvent): boolean {
    if (!isScrollEvent(event)) {
      return false;
    }
    const target = this.focused;
    if (target instanceof ScrollableNode) {
      const deltaX = event.scrollDelta?.x ?? 0;
      const deltaY = event.scrollDelta?.y ?? 0;
      const step = target.getScrollStepValue();
      target.scrollBy(deltaX * step, deltaY * step);
      return true;
    }
    return false;
  }

  private handleResize(event: ResizeEvent): boolean {
    this.renderer.resize(event.width, event.height);
    return true;
  }

  private handleInputKey(node: InputNode, event: KeyPressEvent): boolean {
    const key = event.key.toLowerCase();
    switch (key) {
      case "backspace":
        node.backspace();
        return true;
      case "delete":
        node.delete();
        return true;
      case "arrowleft":
        node.moveCursor(-1);
        return true;
      case "arrowright":
        node.moveCursor(1);
        return true;
      case "home":
        node.setCursor(0);
        return true;
      case "end":
        node.setCursor(node.getValue().length);
        return true;
      case "enter":
        node.submit();
        return true;
      default:
        return false;
    }
  }

  private handleTextareaKey(node: TextareaNode, event: KeyPressEvent): boolean {
    const key = event.key.toLowerCase();
    switch (key) {
      case "backspace":
        node.backspace();
        return true;
      case "delete":
        node.delete();
        return true;
      case "arrowleft":
        node.moveCursor(-1);
        return true;
      case "arrowright":
        node.moveCursor(1);
        return true;
      case "enter":
        node.insert("\n");
        return true;
      default:
        return false;
    }
  }
}
