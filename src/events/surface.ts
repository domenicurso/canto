import readline from "readline";

import { Renderer } from "../renderer";
import { effect } from "../signals";
import { addGlobalSignalChangeListener, StateSignal } from "../signals/core";
import { BaseNode, InputNode, ScrollableNode, TextareaNode } from "../widgets";
import { AsyncChannel, EventBus } from "./bus";
import { collectFocusableNodes } from "./focus";
import { isActivationKey } from "./keyboard";
import { isScrollEvent } from "./mouse";
import { Key } from "./types";

import type { RenderOptions, RenderResult } from "../renderer";
import type { EffectHandle } from "../signals";
import type { Node } from "../widgets";
import type {
  Event,
  KeyPressEvent,
  MouseEvent,
  ResizeEvent,
  SurfaceEventEnvelope,
  SurfaceMiddleware,
  TextInputEvent,
} from "./types";

export class Surface {
  readonly root: Node;
  readonly renderer: Renderer;
  private focusables: BaseNode[] = [];
  private focusedIndex = -1;
  private focused: BaseNode | null = null;
  private stdinSetup = false;
  private bus = new EventBus<SurfaceEventEnvelope>();
  private chan = new AsyncChannel<SurfaceEventEnvelope>();
  private middlewares: SurfaceMiddleware[] = [];
  private renderEffect: EffectHandle | null = null;
  private renderTrigger = new StateSignal(0);
  private globalSignalListener: (() => void) | null = null;
  private isUpdatingTrigger = false;
  private currentRenderOptions: RenderOptions | undefined;
  private terminalSize: { width: number; height: number };
  private stdinBuffer = "";
  private originalStdinData: ((data: Buffer) => void) | null = null;
  private handleTerminalResize = () => {
    if (!process.stdout.isTTY) {
      return;
    }
    const width = process.stdout.columns ?? this.terminalSize.width;
    const height = process.stdout.rows ?? this.terminalSize.height;
    if (
      width <= 0 ||
      height <= 0 ||
      (width === this.terminalSize.width && height === this.terminalSize.height)
    ) {
      return;
    }
    this.terminalSize = { width, height };
    const event: ResizeEvent = { type: "Resize", width, height };
    this.dispatch(event);
  };

  constructor(root: Node, renderer: Renderer) {
    this.root = root;
    this.renderer = renderer;
    this.terminalSize = this.renderer.getSize();
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
    // PRE: broadcast and run middleware chain
    this.emitPre(event);
    const handled = this.runMiddleware(event, 0);
    // POST: report final handled
    this.emitPost(event, handled);
    return handled;
  }

  /** Subscribe to pre/post envelopes. Returns unsubscribe. */
  on(fn: (e: SurfaceEventEnvelope) => void) {
    return this.bus.on(fn);
  }

  /** Convenience typed subscriptions */
  onKey(
    fn: (e: KeyPressEvent, phase: "pre" | "post", handled?: boolean) => void,
  ) {
    return this.on((env) => {
      if (env.event.type !== "KeyPress") return;
      env.phase === "post"
        ? fn(env.event, "post", (env as any).handled)
        : fn(env.event, "pre");
    });
  }

  onText(
    fn: (e: TextInputEvent, phase: "pre" | "post", handled?: boolean) => void,
  ) {
    return this.on((env) => {
      if (env.event.type !== "TextInput") return;
      env.phase === "post"
        ? fn(env.event, "post", (env as any).handled)
        : fn(env.event, "pre");
    });
  }

  onMouse(
    fn: (e: MouseEvent, phase: "pre" | "post", handled?: boolean) => void,
  ) {
    return this.on((env) => {
      if (env.event.type !== "Mouse") return;
      env.phase === "post"
        ? fn(env.event, "post", (env as any).handled)
        : fn(env.event, "pre");
    });
  }

  onResize(
    fn: (e: ResizeEvent, phase: "pre" | "post", handled?: boolean) => void,
  ) {
    return this.on((env) => {
      if (env.event.type !== "Resize") return;
      env.phase === "post"
        ? fn(env.event, "post", (env as any).handled)
        : fn(env.event, "pre");
    });
  }

  /** Async iterator of envelopes: for await (const env of surface.events()) { ... } */
  events(): AsyncIterable<SurfaceEventEnvelope> {
    return this.chan;
  }

  /** Middleware: observe/transform/block before default dispatch. */
  use(mw: SurfaceMiddleware) {
    this.middlewares.push(mw);
    return () => {
      const i = this.middlewares.indexOf(mw);
      if (i >= 0) this.middlewares.splice(i, 1);
    };
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
      options ?? { bounds: { mode: "auto" } },
    );

    // Position cursor at focused input widget
    if (this.focused && this.focused instanceof InputNode) {
      const cursorRect = this.focused.getCursor();
      process.stdout.write(`\x1b[${cursorRect.y + 1};${cursorRect.x + 1}H`);
    }

    return result;
  }

  startRender(options?: RenderOptions): () => void {
    // Stop any existing render loop
    this.stopRender();

    // Store render options for re-rendering
    this.currentRenderOptions = options ?? { bounds: { mode: "auto" } };

    // Set up global signal change listener
    this.globalSignalListener = addGlobalSignalChangeListener(() => {
      this.requestRender();
    });

    // Create an effect that depends on our render trigger
    this.renderEffect = effect(() => {
      // Access the trigger signal to make this effect depend on it
      this.renderTrigger.get();

      // Call render
      this.render(this.currentRenderOptions ?? { bounds: { mode: "auto" } });

      // Also refresh focusables to ensure we track any new nodes
      this.refresh();
    });

    // Do initial render
    this.requestRender();

    // Return a function to stop the render loop
    return () => this.stopRender();
  }

  stopRender(): void {
    if (this.globalSignalListener) {
      this.globalSignalListener();
      this.globalSignalListener = null;
    }
    if (this.renderEffect) {
      this.renderEffect.dispose();
      this.renderEffect = null;
    }
    this.currentRenderOptions = undefined;
  }

  dispose(): void {
    this.stopRender();
    if (this.focused) {
      this.focused.blur();
    }
    if (this.root instanceof BaseNode) {
      this.root.dispose();
    }
    this.chan.close();
    this.cleanupStdin();
  }

  // === INTERNAL: emit helpers ===
  private emitPre(event: Event): void {
    const env: SurfaceEventEnvelope = { phase: "pre", event };
    this.bus.emit(env);
    this.chan.push(env);
  }

  private emitPost(event: Event, handled: boolean): void {
    const env: SurfaceEventEnvelope = { phase: "post", event, handled };
    this.bus.emit(env);
    this.chan.push(env);
  }

  private runMiddleware(event: Event, idx: number): boolean {
    const mw = this.middlewares[idx];
    if (!mw) {
      // terminal step: call the original switch-based handler
      return this.routeEvent(event);
    }
    // middleware can observe/modify/block; next() continues chain
    return mw(event, () => this.runMiddleware(event, idx + 1));
  }

  // factor out the old switch into a method
  private routeEvent(event: Event): boolean {
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

  private setupStdin(): void {
    if (this.stdinSetup || !process.stdin.isTTY) {
      return;
    }

    // Set up raw mode and resume stdin
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();

    // Enable mouse events in terminal
    if (process.stdout.isTTY) {
      // Enable mouse tracking
      process.stdout.write("\x1b[?1000h"); // Basic mouse tracking
      process.stdout.write("\x1b[?1006h"); // SGR mouse mode
    }

    // Handle all raw stdin data manually
    this.originalStdinData = this.handleRawStdinData.bind(this);
    process.stdin.on("data", this.originalStdinData);

    this.stdinSetup = true;

    if (process.stdout.isTTY) {
      process.stdout.on("resize", this.handleTerminalResize);
    }
  }

  private cleanupStdin(): void {
    if (!this.stdinSetup) {
      return;
    }

    // Disable mouse tracking
    if (process.stdout.isTTY) {
      process.stdout.write("\x1b[?1000l"); // Disable mouse tracking
      process.stdout.write("\x1b[?1006l"); // Disable SGR mouse mode
    }

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();

    if (this.originalStdinData) {
      process.stdin.removeListener("data", this.originalStdinData);
      this.originalStdinData = null;
    }

    // Clear buffer
    this.stdinBuffer = "";

    if (process.stdout.isTTY) {
      process.stdout.off("resize", this.handleTerminalResize);
    }

    this.stdinSetup = false;
  }

  private requestRender(): void {
    if (this.isUpdatingTrigger) {
      return;
    }
    this.isUpdatingTrigger = true;
    this.renderTrigger.set(this.renderTrigger.get() + 1);
    this.isUpdatingTrigger = false;
  }

  private handleRawStdinData(buffer: Buffer): void {
    const data = buffer.toString();
    this.stdinBuffer += data;

    // Process complete sequences from buffer
    this.processStdinBuffer();
  }

  private processStdinBuffer(): void {
    let processed = 0;

    while (processed < this.stdinBuffer.length) {
      // Look for mouse escape sequences at current position
      const remaining = this.stdinBuffer.slice(processed);

      // Check for SGR mouse sequence: \x1b[<button;x;y[Mm]
      const sgrMatch = remaining.match(/^(\x1b\[<\d+;\d+;\d+[Mm])/);
      if (sgrMatch && sgrMatch[1]) {
        const sequence = sgrMatch[1];
        this.processMouseSequence(sequence);
        processed += sequence.length;
        continue;
      }

      // Check for basic mouse sequence: \x1b[M followed by 3 bytes
      const basicMatch = remaining.match(/^(\x1b\[M.{3})/);
      if (basicMatch && basicMatch[1]) {
        const sequence = basicMatch[1];
        // Skip basic mouse sequences for now since SGR is more reliable
        processed += sequence.length;
        continue;
      }

      // Check for other escape sequences (arrow keys, function keys, etc.)
      const escapeMatch = remaining.match(/^(\x1b\[[\d;]*[A-Za-z])/);
      if (escapeMatch && escapeMatch[1]) {
        const sequence = escapeMatch[1];
        this.processEscapeSequence(sequence);
        processed += sequence.length;
        continue;
      }

      // Check for single escape character followed by letter (Alt+key)
      const altKeyMatch = remaining.match(/^(\x1b[a-zA-Z])/);
      if (altKeyMatch && altKeyMatch[1]) {
        const sequence = altKeyMatch[1];
        this.processAltKey(sequence);
        processed += sequence.length;
        continue;
      }

      // Process single character
      const char = this.stdinBuffer[processed];
      if (char !== undefined) {
        this.processSingleChar(char);
      }
      processed++;
    }

    // Clear processed data from buffer
    this.stdinBuffer = this.stdinBuffer.slice(processed);
  }

  private processMouseSequence(sequence: string): void {
    // Parse SGR mouse events (format: \x1b[<button;x;y;M/m)
    const sgrMatch = sequence.match(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/);
    if (sgrMatch) {
      const [, buttonStr, xStr, yStr, action] = sgrMatch;
      if (buttonStr && xStr && yStr) {
        const button = parseInt(buttonStr, 10);
        const x = parseInt(xStr, 10) - 1; // Convert to 0-based
        const y = parseInt(yStr, 10) - 1; // Convert to 0-based

        // Check for scroll events (buttons 64-67 are scroll up/down/left/right)
        if (button >= 64 && button <= 67) {
          let deltaX = 0;
          let deltaY = 0;

          switch (button) {
            case 64: // scroll up
              deltaY = -1;
              break;
            case 65: // scroll down
              deltaY = 1;
              break;
            case 66: // scroll left
              deltaX = -1;
              break;
            case 67: // scroll right
              deltaX = 1;
              break;
          }

          const scrollEvent: MouseEvent = {
            type: "Mouse",
            action: "scroll",
            x,
            y,
            scrollDelta: {
              x: deltaX,
              y: deltaY,
            },
          };
          this.dispatch(scrollEvent);
        }
      }
    }
  }

  private processEscapeSequence(sequence: string): void {
    // Parse common escape sequences
    const keyMap: { [key: string]: string } = {
      "\x1b[A": "arrowup",
      "\x1b[B": "arrowdown",
      "\x1b[C": "arrowright",
      "\x1b[D": "arrowleft",
      "\x1b[H": "home",
      "\x1b[F": "end",
      "\x1b[5~": "pageup",
      "\x1b[6~": "pagedown",
      "\x1b[2~": "insert",
      "\x1b[3~": "delete",
    };

    const keyName = keyMap[sequence];
    if (keyName) {
      const event: KeyPressEvent = {
        type: "KeyPress",
        key: keyName,
        ctrl: false,
        shift: false,
        alt: false,
        meta: false,
      };
      this.dispatch(event);
    }
  }

  private processAltKey(sequence: string): void {
    const char = sequence.slice(1); // Remove escape character
    const event: KeyPressEvent = {
      type: "KeyPress",
      key: char,
      ctrl: false,
      shift: false,
      alt: true,
      meta: false,
    };
    this.dispatch(event);
  }

  private processSingleChar(char: string): void {
    const code = char.charCodeAt(0);

    // Handle Ctrl+C
    if (code === 3) {
      this.cleanupStdin();
      process.stdout.write("\x1b[?25h"); // Show cursor
      process.exit(0);
    }

    // Handle special control characters
    if (code < 32) {
      let keyName = "";
      let ctrl = true;

      switch (code) {
        case 8: // Backspace
          keyName = "backspace";
          ctrl = false;
          break;
        case 9: // Tab
          keyName = "tab";
          ctrl = false;
          break;
        case 13: // Enter
          keyName = "return";
          ctrl = false;
          break;
        case 27: // Escape (standalone)
          keyName = "escape";
          ctrl = false;
          break;
        default:
          // Other Ctrl+letter combinations
          keyName = String.fromCharCode(code + 96); // Convert to letter
          break;
      }

      if (keyName) {
        const event: KeyPressEvent = {
          type: "KeyPress",
          key: keyName,
          ctrl,
          shift: false,
          alt: false,
          meta: false,
        };
        this.dispatch(event);
      }
    } else if (code >= 32 && code <= 126) {
      // Printable character
      const event: TextInputEvent = {
        type: "TextInput",
        text: char,
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
    if (key === Key.Tab) {
      return event.shift ? this.focusPrevious() : this.focusNext();
    }
    if (key === Key.Escape) {
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
    if (target instanceof ScrollableNode) {
      return target.handleKeyPress(
        event.key,
        event.ctrl,
        event.shift,
        event.alt,
      );
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

    // Find scrollable node at mouse position
    const scrollableNode = this.findScrollableAt(event.x, event.y);
    if (scrollableNode) {
      const deltaX = event.scrollDelta?.x ?? 0;
      const deltaY = event.scrollDelta?.y ?? 0;
      const step = scrollableNode.getScrollStepValue();
      scrollableNode.scrollBy(deltaX * step, deltaY * step);
      return true;
    }

    return false;
  }

  private findScrollableAt(x: number, y: number): ScrollableNode | null {
    return this.findScrollableInNode(this.root, x, y);
  }

  private findScrollableInNode(
    node: Node,
    x: number,
    y: number,
  ): ScrollableNode | null {
    if (node instanceof ScrollableNode) {
      const layout = (node as any).getLayoutRect?.();
      if (layout && this.pointInRect(x, y, layout)) {
        return node;
      }
    }

    // Check children (traverse in topmost elements are checked first)
    const children = (node as any).children || [];
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      const result = this.findScrollableInNode(child, x, y);
      if (result) {
        return result;
      }
    }

    return null;
  }

  private pointInRect(
    x: number,
    y: number,
    rect: { x: number; y: number; width: number; height: number },
  ): boolean {
    return (
      x >= rect.x &&
      x < rect.x + rect.width &&
      y >= rect.y &&
      y < rect.y + rect.height
    );
  }

  private handleResize(event: ResizeEvent): boolean {
    this.terminalSize = { width: event.width, height: event.height };
    this.renderer.resize(event.width, event.height);
    this.requestRender();
    return true;
  }

  private handleInputKey(node: InputNode, event: KeyPressEvent): boolean {
    const key = event.key.toLowerCase();
    const { ctrl, shift, meta, alt } = event;
    const cmdOrCtrl = ctrl || meta;

    switch (key) {
      case Key.Backspace:
        node.backspace();
        return true;
      case Key.Delete:
        node.delete();
        return true;

      case Key.ArrowLeft:
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

      case Key.ArrowRight:
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

      case Key.ArrowUp:
        if (cmdOrCtrl && shift) {
          node.moveCursorToStart(true);
        } else if (cmdOrCtrl) {
          node.moveCursorToStart(false);
        }
        return true;

      case Key.ArrowDown:
        if (cmdOrCtrl && shift) {
          node.moveCursorToEnd(true);
        } else if (cmdOrCtrl) {
          node.moveCursorToEnd(false);
        }
        return true;

      case Key.Home:
        if (shift) {
          node.moveCursorToStart(true);
        } else {
          node.moveCursorToStart(false);
        }
        return true;

      case Key.End:
        if (shift) {
          node.moveCursorToEnd(true);
        } else {
          node.moveCursorToEnd(false);
        }
        return true;

      case Key.A:
        if (cmdOrCtrl) {
          node.selectAll();
          return true;
        }
        return false;

      case Key.Return:
        node.submit();
        return true;

      default:
        return false;
    }
  }

  private handleTextareaKey(node: TextareaNode, event: KeyPressEvent): boolean {
    const key = event.key.toLowerCase();
    switch (key) {
      case Key.Backspace:
        node.backspace();
        return true;
      case Key.Delete:
        node.delete();
        return true;
      case Key.ArrowLeft:
        node.moveCursor(-1);
        return true;
      case Key.ArrowRight:
        node.moveCursor(1);
        return true;
      case Key.Return:
        node.insert("\n");
        return true;
      default:
        return false;
    }
  }
}
