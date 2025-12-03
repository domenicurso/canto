import { computed, effect, state } from "../signals";
import { Input } from "./input";
import { BaseNode } from "./node";
import { Scrollable } from "./scrollable";
import { HStack, VStack } from "./stack";
import { Text } from "./text";

import type { Constraints } from "../layout";
import type { Signal } from "../signals";
import type { ResolvedStyle } from "../style";
import type { PaintResult, Point, Size } from "../types";
import type { Node } from "./node";
import type { ContainerProps } from "./props";

export interface ConsoleMessage {
  content: string;
  timestamp?: Date;
  file?: string;
  line?: number;
  level?: "info" | "warn" | "error" | "debug" | "success";
}

export interface ConsoleProps extends ContainerProps {
  visible?: boolean | Signal<boolean>;
  height?: number | "auto";
  messages?: ConsoleMessage[] | Signal<ConsoleMessage[]>;
  onInput?: (input: string) => void;
  placeholder?: string;
  maxMessages?: number;
}

export class ConsoleNode extends BaseNode<ConsoleProps> {
  private isVisible: Signal<boolean>;
  private messages: Signal<ConsoleMessage[]>;
  private inputValue: Signal<string>;
  private contentStack: Node | null = null;
  private inputField: Node | null = null;
  private messageContainer: Node | null = null;
  private scrollableContent: Node | null = null;
  private maxMessages: number;

  constructor(props: ConsoleProps = {}) {
    super("Stack", []); // Use Stack as the base type

    // Initialize signals
    this.isVisible =
      typeof props.visible === "object" && "get" in props.visible
        ? (props.visible as Signal<boolean>)
        : state(props.visible ?? true);

    this.messages =
      typeof props.messages === "object" && "get" in props.messages
        ? (props.messages as Signal<ConsoleMessage[]>)
        : state(props.messages ?? []);

    this.inputValue = state("");
    this.maxMessages = props.maxMessages ?? 100;

    // Set props
    this.propsDefinition = props;

    // Create input field once to maintain focus
    this.inputField = Input()
      .bind(this.inputValue)
      .props({
        placeholder: this.propsDefinition.placeholder ?? "enter a command…",
        onSubmit: (value: string) => {
          if (value.trim() && this.propsDefinition.onInput) {
            this.propsDefinition.onInput(value.trim());
          }
          this.inputValue.set("");
        },
      });

    // Create message container and scrollable area once to maintain scroll state
    this.messageContainer = VStack().style({
      padding: [0, 1],
      width: "100%",
    });

    this.scrollableContent =
      this.propsDefinition.height === "auto"
        ? this.messageContainer
        : Scrollable(this.messageContainer).style({
            height: Math.max(1, (this.propsDefinition.height ?? 8) - 2),
            width: "100%",
          });

    this.buildContent();

    // React to visibility and message changes
    effect(() => {
      // Subscribe to signal changes by reading them
      this.isVisible.get();
      this.messages.get();
      this.buildContent();
      this._invalidate();
    });
  }

  private buildContent(): void {
    const isVisible = this.isVisible.get();
    if (!isVisible) {
      this._children = [];
      this.contentStack = null;
      return;
    }

    const messages = this.messages.get();
    const visibleMessages = messages.slice(-this.maxMessages);

    // Create header
    const header = HStack(
      Text("Console").style({ bold: true }),
      Text(computed(() => `${messages.length} messages`)).style({
        faint: true,
      }),
    ).style({
      background: "#333333",
      foreground: "white",
      italic: true,
      padding: [0, 1],
      gap: 1,
      width: "100%",
      distribute: "between",
    });

    // Update message display content without recreating scrollable
    const messageNodes =
      visibleMessages.length > 0
        ? visibleMessages.map((msg, index) => {
            const messageText = msg.content;
            const metadata = [];

            // Add timestamp if present
            if (msg.timestamp) {
              const formatter = new Intl.DateTimeFormat("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              });

              metadata.push(formatter.format(msg.timestamp));
            }

            // // Add file/line info if present
            // if (msg.file && msg.line) {
            //   metadata.push(`${msg.file}:${msg.line}`);
            // } else if (msg.file) {
            //   metadata.push(msg.file);
            // }

            // Color coding for different log levels
            const getLevelColor = (level?: ConsoleMessage["level"]): string => {
              switch (level) {
                case "error":
                  return "red";
                case "warn":
                  return "yellow";
                case "debug":
                  return "blue";
                case "success":
                  return "green";
                case "info":
                default:
                  return "white";
              }
            };

            const levelColor = getLevelColor(msg.level);

            if (metadata.length > 0) {
              const metadataText = `${metadata.join(", ")}`;
              return HStack(
                Text(messageText).style({
                  grow: 1,
                  foreground: levelColor as any,
                }),
                Text(metadataText).style({
                  faint: true,
                  italic: true,
                  foreground: "#888888",
                  shrink: 0,
                }),
              )
                .style({
                  width: "100%",
                  distribute: "between",
                  gap: 2,
                })
                .key(`console-message-${index}`);
            } else {
              return Text(messageText)
                .style({
                  foreground: levelColor as any,
                })
                .key(`console-message-${index}`);
            }
          })
        : [Text("No messages").style({ faint: true, italic: true })];

    // Update the existing message container's children to preserve scroll state
    if (this.messageContainer) {
      (this.messageContainer as any)._children = messageNodes;
      this.messageContainer._invalidate();
    }

    if (!this.inputField) {
      throw new Error("Input field not initialized");
    }

    // Build the complete console UI
    if (!this.scrollableContent) {
      throw new Error("Scrollable content not initialized");
    }

    this.contentStack = VStack(
      header,
      this.scrollableContent,
      HStack(Text(">").style({ faint: true }), this.inputField).style({
        background: "#333333",
        foreground: "white",
        paddingRight: 1,
        width: "100%",
      }),
    ).style({
      background: "#222222",
      foreground: "white",
      gap: 0,
      ...(this.propsDefinition.height !== "auto" && {
        height: this.propsDefinition.height ?? 8,
      }),
      width: "100%",
    });

    this._children = [this.contentStack];
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

      if (match && match[1] && match[2]) {
        const filePath = match[1];
        const line = parseInt(match[2], 10);

        // Extract just the filename from the full path
        const fileName = filePath.split("/").pop() || filePath;

        return { file: fileName, line };
      }
    } catch (e) {
      // Stack trace parsing failed, ignore
    }
    return {};
  }

  addMessage(message: string | ConsoleMessage): void {
    const current = this.messages.get();
    const messageObj: ConsoleMessage =
      typeof message === "string"
        ? { content: message, timestamp: new Date() }
        : message;
    const newMessages = [...current, messageObj];

    // Trim messages if we exceed max
    if (newMessages.length > this.maxMessages) {
      newMessages.splice(0, newMessages.length - this.maxMessages);
    }

    this.messages.set(newMessages);
  }

  clearMessages(): void {
    this.messages.set([]);
  }

  toggle(): void {
    const current = this.isVisible.get();
    this.isVisible.set(!current);
  }

  show(): void {
    this.isVisible.set(true);
  }

  hide(): void {
    this.isVisible.set(false);
  }

  getVisibility(): boolean {
    return this.isVisible.get();
  }

  getInputField(): Node | null {
    return this.inputField;
  }

  _measure(constraints: Constraints, inherited: ResolvedStyle): Size {
    if (!this.isVisible.get()) {
      return { width: 0, height: 0 };
    }

    if (this.contentStack) {
      return this.contentStack._measure(constraints, inherited);
    }

    // Fallback size
    const height =
      this.propsDefinition.height === "auto"
        ? Math.min(this.messages.get().length + 2, constraints.maxHeight)
        : Math.min(this.propsDefinition.height ?? 8, constraints.maxHeight);

    return {
      width: constraints.maxWidth,
      height,
    };
  }

  _layout(origin: Point, size: Size): void {
    this.updateLayoutRect(origin, size);

    if (!this.isVisible.get()) {
      this.dirty = false;
      return;
    }

    if (this.contentStack) {
      this.contentStack._layout(origin, size);
    }

    this.dirty = false;
  }

  _paint(): PaintResult {
    if (!this.isVisible.get()) {
      return { spans: [], rects: [] };
    }

    if (this.contentStack) {
      return this.contentStack._paint();
    }

    return { spans: [], rects: [] };
  }
}

export function Console(props: ConsoleProps = {}): ConsoleNode {
  return new ConsoleNode(props);
}
