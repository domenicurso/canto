import { computed, effect, state } from "../signals";
import { Input, InputNode } from "./input";
import { BaseNode } from "./node";
import { Scrollable } from "./scrollable";
import { HStack, VStack } from "./stack";
import { resolveAxisSize } from "./style-utils";
import { Text } from "./text";

import type { Constraints } from "../layout";
import type { Signal } from "../signals";
import type { Color, ResolvedStyle } from "../style";
import type { PaintResult, Point, Size } from "../types";
import type { Node } from "./node";
import type { ContainerProps } from "./props";

export interface ConsoleMessage {
  content: string;
  timestamp?: Date;
  file?: string;
  line?: number;
  level?:
    | "info"
    | "warn"
    | "error"
    | "debug"
    | "success"
    | "command"
    | "result";
}

export interface ConsoleProps extends ContainerProps {
  onInput?: (input: string) => void;
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
  private replContext: Record<string, any> = {};
  private constVariables: Set<string> = new Set();
  private commandHistory: string[] = [];
  private historyIndex: number = -1;
  private capturedOutput: string[] = [];
  constructor(props: ConsoleProps = {}) {
    super("Stack", []); // Use Stack as the base type

    // Initialize signals with defaults
    this.isVisible = state(true);
    this.messages = state([]);
    this.inputValue = state("");
    this.maxMessages = 500;

    // Set props
    this.propsDefinition = props;

    // Set up stdout capture
    this.setupStdoutCapture();

    // Create input field once to maintain focus
    this.inputField = Input()
      .bind(this.inputValue)
      .props({
        placeholder: "type…",
        onSubmit: (value: string) => {
          if (value.trim()) {
            // Add the command to messages first with distinct styling
            this.addMessage({
              content: `> ${value.trim()}`,
              timestamp: new Date(),
              level: "command",
            });

            // Add to command history
            this.commandHistory.push(value.trim());
            if (this.commandHistory.length > 50) {
              this.commandHistory.shift();
            }

            // Reset history index
            this.historyIndex = -1;

            // Handle REPL evaluation
            this.handleReplInput(value.trim());
          }
          this.inputValue.set("");
        },
      });

    // Create message container and scrollable area once to maintain scroll state
    this.messageContainer = VStack().style({
      padding: [0, 1],
      width: "100%",
    });

    this.scrollableContent = Scrollable(this.messageContainer)
      .style({
        height: "100%",
        maxHeight: Math.max(1, 16 - 2),
        width: "100%",
        scrollbarBackground: "#222222",
        scrollbarForeground: "#333333",
      })
      .props({ scrollbarEnabled: true });

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
      Text(
        computed(() => {
          const msgs = this.messages.get();
          const nonCommandCount = msgs.filter(
            (msg) => msg.level !== "command",
          ).length;
          return `${nonCommandCount} messages`;
        }),
      ).style({
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
            const getLevelColor = (level?: ConsoleMessage["level"]): Color => {
              switch (level) {
                case "error":
                  return "red";
                case "warn":
                  return "yellow";
                case "debug":
                  return "blue";
                case "success":
                  return "green";
                case "command":
                  return "magenta";
                case "result":
                  return "cyan";
                case "info":
                default:
                  return "white";
              }
            };

            const levelColor = getLevelColor(msg.level);

            // Special styling for command messages
            const isCommand = msg.level === "command";
            const textStyle = {
              foreground: levelColor,
              ...(isCommand && { italic: true }),
            };

            if (metadata.length > 0) {
              const metadataText = `${metadata.join(", ")}`;
              return HStack(
                Text(messageText).style({
                  grow: 1,
                  ...textStyle,
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
                .style(textStyle)
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
      width: "100%",
    });

    this._children = [this.contentStack];
  }

  private setupStdoutCapture(): void {
    console.log = (...args: any[]) => {
      // Capture the output
      const output = args
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg),
        )
        .join(" ");
      this.capturedOutput.push(output);
    };
  }

  public handleReplInput(input: string): void {
    const trimmedInput = input.trim();

    // Handle special commands
    if (this.handleSpecialCommands(trimmedInput)) {
      return;
    }

    // Check for variable redeclaration and const reassignment
    const validationError = this.validateVariableUsage(trimmedInput);
    if (validationError) {
      this.addMessage({
        content: `Error: ${validationError}`,
        timestamp: new Date(),
        level: "error",
      });
      return;
    }

    // Clear captured output before execution
    this.capturedOutput = [];

    // Handle JavaScript evaluation
    try {
      // Convert const/let to var for global scope persistence
      let modifiedInput = trimmedInput
        .replace(/\bconst\s+/g, "var ")
        .replace(/\blet\s+/g, "var ");

      // Create context setup code
      const contextKeys = Object.keys(this.replContext);
      const contextValues = contextKeys.map((key) => this.replContext[key]);
      const contextSetup = contextKeys
        .map((key) => `var ${key} = arguments[${contextKeys.indexOf(key)}];`)
        .join("\n");

      const func = new Function(
        ...contextKeys,
        `
        ${contextSetup}
        try {
          const result = eval(${JSON.stringify(modifiedInput)});
          return { success: true, result };
        } catch (error) {
          return { success: false, error: error.message };
        }
      `,
      );

      const evaluation = func(...contextValues);

      // Extract new variables from the modified input
      if (evaluation.success) {
        this.extractVariablesFromModifiedInput(
          modifiedInput,
          contextKeys,
          contextValues,
          trimmedInput, // Pass original input to track const declarations
        );
      }

      // Display any captured stdout first
      if (this.capturedOutput.length > 0) {
        this.capturedOutput.forEach((output) => {
          this.addMessage({
            content: output,
            timestamp: new Date(),
            level: "info",
          });
        });
      }

      if (evaluation.success) {
        const result = evaluation.result;

        // Store the result in the special variable _
        this.replContext._ = result;

        // Display the result only if it's not undefined
        if (result !== undefined) {
          let resultStr = "";
          if (result === null) {
            resultStr = "null";
          } else if (typeof result === "string") {
            resultStr = `"${result}"`;
          } else if (typeof result === "object") {
            try {
              resultStr = JSON.stringify(result, null, 2);
            } catch {
              resultStr = result.toString();
            }
          } else {
            resultStr = String(result);
          }

          this.addMessage({
            content: resultStr,
            timestamp: new Date(),
            level: "result",
          });
        }
      } else {
        this.addMessage({
          content: `Error: ${evaluation.error}`,
          timestamp: new Date(),
          level: "error",
        });
      }
    } catch (error) {
      this.addMessage({
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date(),
        level: "error",
      });
    }
  }

  private handleSpecialCommands(input: string): boolean {
    switch (input.toLowerCase()) {
      case "clear":
        this.clearMessages();
        return true;
      default:
        return false;
    }
  }

  private extractVariablesFromModifiedInput(
    modifiedInput: string,
    contextKeys: string[],
    contextValues: any[],
    originalInput: string,
  ): void {
    // Extract variable names from var declarations and assignments
    const varMatches = modifiedInput.match(
      /\bvar\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
    );
    const assignmentMatches = modifiedInput.match(
      /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g,
    );

    const allVariableNames = new Set<string>();

    if (varMatches) {
      varMatches.forEach((match) => {
        const varName = match.replace(/\bvar\s+/, "");
        allVariableNames.add(varName);
      });
    }

    if (assignmentMatches) {
      assignmentMatches.forEach((match) => {
        const varName = match.replace(/\s*=/, "");
        allVariableNames.add(varName);
      });
    }

    // Extract values for these variables
    allVariableNames.forEach((varName) => {
      try {
        const contextSetup = contextKeys
          .map((key) => `var ${key} = arguments[${contextKeys.indexOf(key)}];`)
          .join("\n");

        const func = new Function(
          ...contextKeys,
          `
          ${contextSetup}
          try {
            eval(${JSON.stringify(modifiedInput)});
            return typeof ${varName} !== 'undefined' ? ${varName} : undefined;
          } catch {
            return undefined;
          }
        `,
        );

        const value = func(...contextValues);
        if (value !== undefined) {
          this.replContext[varName] = value;

          // Track const variables from original input
          if (originalInput.includes(`const ${varName}`)) {
            this.constVariables.add(varName);
          }
        }
      } catch {
        // If we can't extract the value, that's okay
      }
    });
  }

  private navigateHistory(direction: "up" | "down"): void {
    if (this.commandHistory.length === 0) {
      return;
    }

    if (direction === "up") {
      if (this.historyIndex === -1) {
        this.historyIndex = this.commandHistory.length - 1;
      } else if (this.historyIndex > 0) {
        this.historyIndex--;
      }
    } else if (direction === "down") {
      if (this.historyIndex < this.commandHistory.length - 1) {
        this.historyIndex++;
      } else {
        this.historyIndex = -1;
        this.inputValue.set("");
        return;
      }
    }

    if (
      this.historyIndex >= 0 &&
      this.historyIndex < this.commandHistory.length
    ) {
      const command = this.commandHistory[this.historyIndex];
      if (command) {
        this.inputValue.set(command);
        // Move cursor to end of input
        if (this.inputField instanceof InputNode) {
          this.inputField.moveCursorToEnd();
        }
      }
    }
  }

  // Handle keyboard events for the console input
  public handleKeyPress(
    key: string,
    ctrl?: boolean,
    shift?: boolean,
    alt?: boolean,
  ): boolean {
    const keyLower = key.toLowerCase();

    // Handle arrow key history navigation
    if (keyLower === "arrowup") {
      this.navigateHistory("up");
      return true; // Prevent default behavior
    } else if (keyLower === "arrowdown") {
      this.navigateHistory("down");
      return true; // Prevent default behavior
    }

    return false; // Allow default behavior for other keys
  }

  // Check if this console's input is currently focused
  public isInputFocused(): boolean {
    if (this.inputField && this.inputField instanceof InputNode) {
      return this.inputField.isFocused();
    }
    return false;
  }

  private validateVariableUsage(input: string): string | null {
    // Check for variable redeclarations
    const varDeclMatches = input.match(
      /\b(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
    );
    if (varDeclMatches) {
      for (const match of varDeclMatches) {
        const varName = match.replace(/\b(?:var|let|const)\s+/, "");
        if (this.replContext.hasOwnProperty(varName)) {
          return `Identifier '${varName}' has already been declared`;
        }
      }
    }

    // Check for const reassignment
    const assignmentMatches = input.match(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g);
    if (assignmentMatches) {
      for (const match of assignmentMatches) {
        const varName = match.replace(/\s*=/, "");
        // Skip if this is a declaration (handled above)
        if (
          !input.includes(`var ${varName}`) &&
          !input.includes(`let ${varName}`) &&
          !input.includes(`const ${varName}`)
        ) {
          if (this.constVariables.has(varName)) {
            return `Assignment to constant`;
          }
        }
      }
    }

    return null;
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
    const style = this.resolveCurrentStyle(inherited);
    if (!this.isVisible.get()) {
      return { width: 0, height: 0 };
    }

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

    let childSize: Size = { width: 0, height: 0 };
    if (this.contentStack) {
      childSize = this.contentStack._measure(innerConstraints, style);
    } else {
      const fallbackHeight = Math.min(8, innerConstraints.maxHeight);
      const fallbackWidth = Number.isFinite(innerConstraints.maxWidth)
        ? innerConstraints.maxWidth
        : constraints.maxWidth;
      childSize = {
        width: Math.max(fallbackWidth, innerConstraints.minWidth, 0),
        height: Math.max(fallbackHeight, 0),
      };
    }

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

    if (!this.isVisible.get()) {
      this.dirty = false;
      return;
    }

    if (this.contentStack) {
      const padding = style.padding;
      const childOrigin = {
        x: origin.x + padding.left,
        y: origin.y + padding.top,
      };
      const childSize = {
        width: Math.max(size.width - (padding.left + padding.right), 0),
        height: Math.max(size.height - (padding.top + padding.bottom), 0),
      };
      this.contentStack._layout(childOrigin, childSize);
    }

    this.dirty = false;
  }

  _paint(): PaintResult {
    if (!this.isVisible.get()) {
      return { spans: [], rects: [] };
    }

    const result = this.paintChildren();
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

export function Console(props: ConsoleProps = {}): ConsoleNode {
  return new ConsoleNode(props);
}
