import { effect, state } from "../signals";
import { Console as ConsoleInternal, ConsoleNode } from "./console";
import { BaseNode } from "./node";
import { Stack, VStack } from "./stack";
import { resolveAxisSize } from "./style-utils";

import type { Constraints } from "../layout";
import type { Signal } from "../signals";
import type { ResolvedStyle } from "../style";
import type { PaintResult, Point, Size } from "../types";
import type { ConsoleMessage } from "./console";
import type { Node } from "./node";
import type { ContainerProps } from "./props";

// Forward declaration for Surface type
interface SurfaceLike {
  focus(node: Node): void;
  use(middleware: (event: any, next: () => boolean) => boolean): () => void;
}

export interface ConsoleOverlayProps extends ContainerProps {
  content: Node;
  onConsoleInput?: (input: string) => void;
}

export class ConsoleOverlayNode extends BaseNode<ConsoleOverlayProps> {
  private console: ConsoleNode;
  private isConsoleVisible: Signal<boolean>;
  private contentNode: Node;
  private surface: SurfaceLike | null = null;

  constructor(props: ConsoleOverlayProps) {
    super("Stack", []);

    this.contentNode = props.content;
    this.isConsoleVisible = state(false);
    // Set props
    this.propsDefinition = props;

    // Create the console
    this.console = ConsoleInternal({});

    this.updateChildren();

    // Set up reactive updates
    effect(() => {
      // This effect will run whenever isConsoleVisible changes
      this.isConsoleVisible.get(); // Subscribe to changes
      this.updateChildren();
      this._invalidate();
    });
  }

  private updateChildren(): void {
    this._children = [this.buildLayeredTree()];
  }

  public handleKeyPress(
    key: string,
    ctrl?: boolean,
    shift?: boolean,
    alt?: boolean,
  ): boolean {
    // Only handle keys if console is visible and input is focused
    if (!this.isVisible() || !this.console.isInputFocused()) {
      return false;
    }

    const keyLower = key.toLowerCase();

    // Handle arrow key history navigation
    if (keyLower === "arrowup") {
      this.console.handleKeyPress(key, ctrl, shift, alt);
      return true; // Prevent default behavior
    } else if (keyLower === "arrowdown") {
      this.console.handleKeyPress(key, ctrl, shift, alt);
      return true; // Prevent default behavior
    }

    return false; // Allow default behavior for other keys
  }

  private buildLayeredTree(): Node {
    if (!this.isConsoleVisible.get()) {
      return this.contentNode;
    }

    const consoleWrapper = VStack(this.console).style({
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      width: "100%",
      gap: 0,
      background: "#111111",
      zIndex: 1,
    });

    return Stack(this.contentNode, consoleWrapper).style({
      width: "100%",
      height: "100%",
    });
  }

  addMessage(message: string | ConsoleMessage): void {
    this.console.addMessage(message);
  }

  clearConsole(): void {
    this.console.clearMessages();
  }

  toggleConsole(): void {
    const current = this.isConsoleVisible.get();
    this.isConsoleVisible.set(!current);

    // Focus the console input when console becomes visible
    if (!current && this.surface) {
      this.focusConsoleInput();
    }
  }

  showConsole(): void {
    this.isConsoleVisible.set(true);

    // Focus the console input when console becomes visible
    if (this.surface) {
      this.focusConsoleInput();
    }
  }

  hideConsole(): void {
    this.isConsoleVisible.set(false);
  }

  isVisible(): boolean {
    return this.isConsoleVisible.get();
  }

  setSurface(surface: SurfaceLike): void {
    this.surface = surface;

    // Add middleware to intercept keyboard events
    surface.use((event, next) => {
      if (
        event.type === "KeyPress" &&
        this.isVisible() &&
        this.console.isInputFocused()
      ) {
        const handled = this.handleKeyPress(
          event.key,
          event.ctrl,
          event.shift,
          event.alt,
        );
        if (handled) {
          return true; // Event was handled, don't continue
        }
      }
      return next(); // Continue with default handling
    });
  }

  private focusConsoleInput(): void {
    // Use setTimeout to ensure the console is rendered before focusing
    setTimeout(() => {
      const inputField = this.console.getInputField();
      if (inputField && this.surface) {
        this.surface.focus(inputField);
      }
    }, 0);
  }

  _measure(constraints: Constraints, inherited: ResolvedStyle): Size {
    const style = this.resolveCurrentStyle(inherited);
    const padding = style.padding;
    const horizontalPadding = padding.left + padding.right;
    const verticalPadding = padding.top + padding.bottom;

    const innerConstraints: Constraints = {
      minWidth: Math.max(0, constraints.minWidth - horizontalPadding),
      maxWidth: Number.isFinite(constraints.maxWidth)
        ? Math.max(0, constraints.maxWidth - horizontalPadding)
        : constraints.maxWidth,
      minHeight: Math.max(0, constraints.minHeight - verticalPadding),
      maxHeight: Number.isFinite(constraints.maxHeight)
        ? Math.max(0, constraints.maxHeight - verticalPadding)
        : constraints.maxHeight,
    };

    const child = this._children[0];
    const childSize = child
      ? child._measure(innerConstraints, style)
      : { width: 0, height: 0 };

    const intrinsicWidth = childSize.width + horizontalPadding;
    const intrinsicHeight = childSize.height + verticalPadding;

    const width = resolveAxisSize(
      style.width,
      style.minWidth,
      style.maxWidth,
      intrinsicWidth,
      constraints.minWidth,
      constraints.maxWidth,
    );

    const height = resolveAxisSize(
      style.height,
      style.minHeight,
      style.maxHeight,
      intrinsicHeight,
      constraints.minHeight,
      constraints.maxHeight,
    );

    return { width, height };
  }

  _layout(origin: Point, size: Size): void {
    const style = this.getResolvedStyle();
    this.updateLayoutRect(origin, size);

    const child = this._children[0];
    if (child) {
      const padding = style.padding;
      const childOrigin = {
        x: origin.x + padding.left,
        y: origin.y + padding.top,
      };
      const childSize = {
        width: Math.max(size.width - (padding.left + padding.right), 0),
        height: Math.max(size.height - (padding.top + padding.bottom), 0),
      };
      child._layout(childOrigin, childSize);
    }

    this.dirty = false;
  }

  _paint(): PaintResult {
    const child = this._children[0];
    const result = child ? child._paint() : { spans: [], rects: [] };
    const style = this.getResolvedStyle();
    if (style.background !== null) {
      const layout = this.getLayoutRect();
      result.rects.unshift({
        x: layout.x,
        y: layout.y,
        width: layout.width,
        height: layout.height,
        style: this.getStyleSnapshot(),
      });
    }
    return result;
  }
}

export function ConsoleOverlay(props: ConsoleOverlayProps): ConsoleOverlayNode {
  return new ConsoleOverlayNode(props);
}

// Convenience function to wrap any content with console overlay
export function withConsole(
  content: Node,
  onConsoleInput?: (input: string) => void,
): ConsoleOverlayNode {
  return new ConsoleOverlayNode({
    content,
    onConsoleInput,
  });
}

// Global console manager for easy access
export class GlobalConsoleManager {
  private overlay: ConsoleOverlayNode | null = null;

  setOverlay(overlay: ConsoleOverlayNode): void {
    this.overlay = overlay;
  }

  private getStackInfo(): { file?: string; line?: number } {
    try {
      // Create an error to get stack trace
      const error = new Error();
      const stack = error.stack;
      if (!stack) return {};

      // Split stack into lines and find the caller (skip our internal methods)
      const lines = stack.split("\n");
      // Skip: Error constructor, this method, the calling log method
      const callerLine = lines[3] || lines[2] || "";

      // Parse different stack trace formats
      // Chrome/V8: "    at functionName (file:///path/file.ts:line:col)"
      // Firefox: "functionName@file:///path/file.ts:line:col"
      let match =
        callerLine.match(/at\s+.*?\((.+):(\d+):\d+\)/) ||
        callerLine.match(/at\s+(.+):(\d+):\d+/) ||
        callerLine.match(/@(.+):(\d+):\d+/);

      if (match) {
        const filePath = match[1] ?? "";
        const line = parseInt(match[2] ?? "0", 10);

        // Extract just the filename from the full path
        const fileName = filePath.split("/").pop() || filePath;

        return { file: fileName, line };
      }
    } catch (e) {
      // Stack trace parsing failed, ignore
    }
    return {};
  }

  log(message: string): void {
    if (this.overlay) {
      const stackInfo = this.getStackInfo();
      const consoleMessage: ConsoleMessage = {
        content: message,
        timestamp: new Date(),
        level: "info",
        ...stackInfo,
      };
      this.overlay.addMessage(consoleMessage);
    }
  }

  // Method to execute JavaScript directly
  eval(code: string): void {
    if (this.overlay) {
      // Add the command as if it was typed
      this.overlay.addMessage({
        content: `> ${code}`,
        timestamp: new Date(),
        level: "command",
      });

      // The console will handle the actual evaluation
      // We just need to trigger the input handler
      const console = (this.overlay as any).console;
      if (console && console.handleReplInput) {
        console.handleReplInput(code);
      }
    }
  }

  error(message: string): void {
    if (this.overlay) {
      const stackInfo = this.getStackInfo();
      const consoleMessage: ConsoleMessage = {
        content: message,
        timestamp: new Date(),
        level: "error",
        ...stackInfo,
      };
      this.overlay.addMessage(consoleMessage);
    }
  }

  warn(message: string): void {
    if (this.overlay) {
      const stackInfo = this.getStackInfo();
      const consoleMessage: ConsoleMessage = {
        content: message,
        timestamp: new Date(),
        level: "warn",
        ...stackInfo,
      };
      this.overlay.addMessage(consoleMessage);
    }
  }

  debug(message: string): void {
    if (this.overlay) {
      const stackInfo = this.getStackInfo();
      const consoleMessage: ConsoleMessage = {
        content: message,
        timestamp: new Date(),
        level: "debug",
        ...stackInfo,
      };
      this.overlay.addMessage(consoleMessage);
    }
  }

  success(message: string): void {
    if (this.overlay) {
      const stackInfo = this.getStackInfo();
      const consoleMessage: ConsoleMessage = {
        content: message,
        timestamp: new Date(),
        level: "success",
        ...stackInfo,
      };
      this.overlay.addMessage(consoleMessage);
    }
  }

  command(message: string): void {
    if (this.overlay) {
      const stackInfo = this.getStackInfo();
      const consoleMessage: ConsoleMessage = {
        content: message,
        timestamp: new Date(),
        level: "command",
        ...stackInfo,
      };
      this.overlay.addMessage(consoleMessage);
    }
  }

  clear(): void {
    if (this.overlay) {
      this.overlay.clearConsole();
    }
  }

  toggle(): void {
    if (this.overlay) {
      this.overlay.toggleConsole();
    }
  }

  show(): void {
    if (this.overlay) {
      this.overlay.showConsole();
    }
  }

  hide(): void {
    if (this.overlay) {
      this.overlay.hideConsole();
    }
  }

  isVisible(): boolean {
    return this.overlay?.isVisible() ?? false;
  }

  // Execute JavaScript code programmatically
  execute(code: string): void {
    this.eval(code);
  }
}

// Export a global instance
export const Console = new GlobalConsoleManager();
