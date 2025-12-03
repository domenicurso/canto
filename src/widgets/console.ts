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

export interface ConsoleProps extends ContainerProps {
  visible?: boolean | Signal<boolean>;
  height?: number | "auto";
  messages?: string[] | Signal<string[]>;
  onInput?: (input: string) => void;
  placeholder?: string;
  maxMessages?: number;
}

export class ConsoleNode extends BaseNode<ConsoleProps> {
  private isVisible: Signal<boolean>;
  private messages: Signal<string[]>;
  private inputValue: Signal<string>;
  private contentStack: Node | null = null;
  private inputField: Node | null = null;
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
        ? (props.messages as Signal<string[]>)
        : state(props.messages ?? []);

    this.inputValue = state("");
    this.maxMessages = props.maxMessages ?? 100;

    // Set props
    this.propsDefinition = props;

    // Create input field once to maintain focus
    this.inputField = Input()
      .bind(this.inputValue)
      .props({
        placeholder: this.propsDefinition.placeholder ?? "Enter command...",
        onSubmit: (value: string) => {
          if (value.trim() && this.propsDefinition.onInput) {
            this.propsDefinition.onInput(value.trim());
          }
          this.inputValue.set("");
        },
      })
      .style({
        // background: "#333333",
        foreground: "white",
        padding: [0, 1],
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
      Text("Canto Console").style({ bold: true }),
      Text(computed(() => `${messages.length} messages`)),
    ).style({
      background: "#333333",
      foreground: "white",
      italic: true,
      padding: [0, 1],
      gap: 1,
      width: "100%",
    });

    // Create message display
    const messageNodes =
      visibleMessages.length > 0
        ? visibleMessages.map((msg, index) =>
            Text(msg).key(`console-message-${index}`),
          )
        : [
            Text("No messages").style({
              foreground: "#888888",
              italic: true,
            }),
          ];

    const messageContainer = VStack(...messageNodes).style({
      padding: [0, 1],
    });

    // Create scrollable content area
    const scrollableContent =
      this.propsDefinition.height === "auto"
        ? messageContainer
        : Scrollable(messageContainer).style({
            maxHeight: Math.max(1, (this.propsDefinition.height ?? 8) - 2),
          });

    if (!this.inputField) {
      throw new Error("Input field not initialized");
    }

    // Build the complete console UI
    this.contentStack = VStack(
      header,
      scrollableContent,
      this.inputField,
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

  addMessage(message: string): void {
    const current = this.messages.get();
    const newMessages = [...current, message];

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
