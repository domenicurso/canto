import { effect, state } from "../signals";
import { Console as ConsoleInternal, ConsoleNode } from "./console";
import { BaseNode } from "./node";
import { VStack } from "./stack";

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
}

export interface ConsoleOverlayProps extends ContainerProps {
  content: Node;
  consoleHeight?: number | "auto";
  toggleKey?: string;
  initialVisible?: boolean;
  onConsoleInput?: (input: string) => void;
  consolePlaceholder?: string;
  maxMessages?: number;
}

export class ConsoleOverlayNode extends BaseNode<ConsoleOverlayProps> {
  private console: ConsoleNode;
  private isConsoleVisible: Signal<boolean>;
  private messages: Signal<ConsoleMessage[]>;
  private contentNode: Node;
  private surface: SurfaceLike | null = null;

  constructor(props: ConsoleOverlayProps) {
    super("Stack", []);

    this.contentNode = props.content;
    this.isConsoleVisible = state(props.initialVisible ?? false);
    this.messages = state([]);

    // Set props
    this.propsDefinition = props;

    // Create the console
    this.console = ConsoleInternal({
      visible: this.isConsoleVisible,
      height: props.consoleHeight ?? 8,
      messages: this.messages,
      onInput: props.onConsoleInput,
      placeholder: props.consolePlaceholder,
      maxMessages: props.maxMessages,
    });

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
    const isVisible = this.isConsoleVisible.get();

    if (isVisible) {
      // When console is visible, stack content above console
      this._children = [
        VStack(this.contentNode, this.console).style({
          gap: 0,
        }),
      ];
    } else {
      // When console is hidden, just show content
      this._children = [this.contentNode];
    }
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
    const child = this._children[0];
    if (child) {
      return child._measure(constraints, inherited);
    }
    return { width: 0, height: 0 };
  }

  _layout(origin: Point, size: Size): void {
    this.updateLayoutRect(origin, size);

    const child = this._children[0];
    if (child) {
      child._layout(origin, size);
    }

    this.dirty = false;
  }

  _paint(): PaintResult {
    const child = this._children[0];
    if (child) {
      return child._paint();
    }
    return { spans: [], rects: [] };
  }
}

export function ConsoleOverlay(props: ConsoleOverlayProps): ConsoleOverlayNode {
  return new ConsoleOverlayNode(props);
}

// Convenience function to wrap any content with console overlay
export function withConsole(
  content: Node,
  options: Omit<ConsoleOverlayProps, "content"> = {},
): ConsoleOverlayNode {
  return new ConsoleOverlayNode({
    content,
    ...options,
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
}

// Export a global instance
export const Console = new GlobalConsoleManager();
