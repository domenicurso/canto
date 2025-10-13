import readline from "readline";

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
  private stdinSetup = false;

  constructor(root: Node, renderer: Renderer) {
    this.root = root;
    this.renderer = renderer;
    this.refreshFocusables();
    this.setupStdin();
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
    const result = this.renderer.render(
      this.root,
      options ?? { mode: "fullscreen" },
    );

    // Position cursor at focused input widget
    if (this.focused && this.focused instanceof InputNode) {
      const cursorRect = this.focused.getCursor();
      process.stdout.write(`\x1b[${cursorRect.y + 1};${cursorRect.x + 1}H`);
    }

    return result;
  }

  dispose(): void {
    if (this.focused) {
      this.focused.blur();
    }
    if (this.root instanceof BaseNode) {
      this.root.dispose();
    }
    this.cleanupStdin();
  }

  private setupStdin(): void {
    if (this.stdinSetup || !process.stdin.isTTY) {
      return;
    }

    // Set up stdin for keypress handling
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();

    // Handle keypresses and forward to Surface
    process.stdin.on("keypress", this.handleStdinKeypress.bind(this));

    this.stdinSetup = true;
  }

  private cleanupStdin(): void {
    if (!this.stdinSetup) {
      return;
    }

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
    process.stdin.removeAllListeners("keypress");

    this.stdinSetup = false;
  }

  private handleStdinKeypress(str: string, key: any): void {
    // Handle Ctrl+C
    if (key && key.ctrl && key.name === "c") {
      this.cleanupStdin();
      process.stdout.write("\x1b[?25h"); // Show cursor
      process.exit(0);
      return;
    }

    if (!key) {
      return;
    }

    // Special keys that should always be handled as KeyPressEvent
    const specialKeys = new Set([
      "backspace",
      "delete",
      "tab",
      "escape",
      "enter",
      "return",
      "left",
      "right",
      "up",
      "down",
      "home",
      "end",
      "pageup",
      "pagedown",
    ]);

    // Map key names - readline uses 'left' not 'arrowleft'
    let keyName = key.name;
    if (keyName === "left") keyName = "arrowleft";
    if (keyName === "right") keyName = "arrowright";
    if (keyName === "up") keyName = "arrowup";
    if (keyName === "down") keyName = "arrowdown";

    // Check if this should be handled as a KeyPress event
    const hasModifiers = key.ctrl || key.meta || key.alt;
    const isSpecialKey = key.name && specialKeys.has(key.name);

    if (isSpecialKey || hasModifiers) {
      // Handle as KeyPressEvent for special keys or keys with modifiers
      const event: KeyPressEvent = {
        type: "KeyPress",
        key: keyName || key.name || str || "",
        ctrl: key.ctrl || false,
        shift: key.shift || false,
        alt: key.alt || false,
        meta: key.meta || false,
      };
      this.dispatch(event);
    } else if (str && str.length === 1 && str >= " " && str <= "~") {
      // Handle printable characters as TextInputEvent (only when no modifiers)
      const event: TextInputEvent = {
        type: "TextInput",
        text: str,
      };
      this.dispatch(event);
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
    const { ctrl, shift, meta, alt } = event;
    const cmdOrCtrl = ctrl || meta;

    switch (key) {
      case "backspace":
        node.backspace();
        return true;
      case "delete":
        node.delete();
        return true;

      case "arrowleft":
        if (cmdOrCtrl && shift) {
          node.moveCursorToStart(true);
        } else if (cmdOrCtrl) {
          node.moveCursorToStart(false);
        } else if (shift) {
          node.moveCursor(-1, true);
        } else {
          node.moveCursor(-1, false);
        }
        return true;

      case "arrowright":
        if (cmdOrCtrl && shift) {
          node.moveCursorToEnd(true);
        } else if (cmdOrCtrl) {
          node.moveCursorToEnd(false);
        } else if (shift) {
          node.moveCursor(1, true);
        } else {
          node.moveCursor(1, false);
        }
        return true;

      case "arrowup":
        if (cmdOrCtrl && shift) {
          node.moveCursorToStart(true);
        } else if (cmdOrCtrl) {
          node.moveCursorToStart(false);
        }
        return true;

      case "arrowdown":
        if (cmdOrCtrl && shift) {
          node.moveCursorToEnd(true);
        } else if (cmdOrCtrl) {
          node.moveCursorToEnd(false);
        }
        return true;

      case "home":
        if (shift) {
          node.moveCursorToStart(true);
        } else {
          node.moveCursorToStart(false);
        }
        return true;

      case "end":
        if (shift) {
          node.moveCursorToEnd(true);
        } else {
          node.moveCursorToEnd(false);
        }
        return true;

      case "a":
        if (cmdOrCtrl) {
          node.selectAll();
          return true;
        }
        return false;

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
