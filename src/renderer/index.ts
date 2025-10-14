import { performance } from "node:perf_hooks";

import { constraints } from "../layout";
import { createDefaultStyle, DEFAULT_STYLE_SNAPSHOT } from "../style";
import { resetAnsi, styleToAnsi } from "./ansi";
import { CellBuffer } from "./buffer";
import { diffCells } from "./diff";
import { TerminalDriver } from "./terminal";

import type { Constraints } from "../layout";
import type { StyleSnapshot } from "../style";
import type { PaintResult, Rect } from "../types";
import type { Node } from "../widgets";
import type { Cell } from "./buffer";

export type RenderMode = "fullscreen" | "manual" | "auto";

/**
 * Cursor behavior after rendering - where to position the cursor.
 */
export type CursorBehavior =
  | "preserve" // Keep cursor at its original position (useful for inline updates)
  | "after"; // Position cursor after the rendered content (default for flowing content)

/**
 * Cursor visibility after rendering - whether cursor should be shown or hidden.
 */
export type CursorVisibility =
  | "visible" // Show cursor after rendering
  | "hidden"; // Keep cursor hidden after rendering

/**
 * Cursor configuration with separate behavior and visibility controls.
 *
 * This allows fine-grained control over cursor positioning and appearance:
 * - Behavior controls WHERE the cursor ends up after rendering
 * - Visibility controls WHETHER the cursor is shown or hidden
 *
 * Common combinations:
 * - `{ behavior: "after", visibility: "visible" }` - Default for flowing content (like text output)
 * - `{ behavior: "preserve", visibility: "visible" }` - For inline updates that shouldn't move cursor
 * - `{ behavior: "after", visibility: "hidden" }` - For static displays where cursor would be distracting
 * - `{ behavior: "preserve", visibility: "hidden" }` - For background updates with no visual cursor changes
 *
 * @example
 * ```ts
 * // Text output that flows naturally - cursor moves after content and stays visible
 * render(textWidget, {
 *   bounds: { mode: "auto" },
 *   cursor: { behavior: "after", visibility: "visible" }
 * });
 *
 * // Status bar update that shouldn't disrupt typing - preserve cursor position
 * render(statusBar, {
 *   bounds: { mode: "manual", width: 80, height: 1, x: 0, y: 0 },
 *   cursor: { behavior: "preserve", visibility: "visible" }
 * });
 *
 * // Fullscreen app where cursor would be distracting - hide it
 * render(gameUI, {
 *   bounds: { mode: "fullscreen" },
 *   cursor: { behavior: "after", visibility: "hidden" }
 * });
 *
 * // Background progress indicator - no cursor changes at all
 * render(progressBar, {
 *   bounds: { mode: "manual", width: 20, height: 1, x: 60, y: 10 },
 *   cursor: { behavior: "preserve", visibility: "hidden" }
 * });
 * ```
 */
export interface CursorConfig {
  /** Where to position the cursor. Defaults to "after". */
  behavior?: CursorBehavior;
  /** Whether to show or hide the cursor. Defaults to "visible". */
  visibility?: CursorVisibility;
}

/**
 * Render bounds configuration with strict typing based on render mode.
 *
 * Uses discriminated unions to ensure type safety - only valid combinations
 * of properties are allowed for each render mode.
 */
export type RenderBounds = FullscreenBounds | ManualBounds | AutoBounds;

/**
 * Fullscreen rendering bounds - renders to the entire terminal viewport.
 *
 * Clears the screen and renders content to fill the entire terminal.
 * Ideal for applications that need full control over the display.
 */
export interface FullscreenBounds {
  mode: "fullscreen";
}

/**
 * Manual rendering bounds - render to exact dimensions and position.
 *
 * Provides precise control over render area. Requires explicit width and height.
 * Position defaults to (0,0) if not specified.
 */
export interface ManualBounds {
  mode: "manual";
  /** Exact width in terminal columns */
  width: number;
  /** Exact height in terminal rows */
  height: number;
  /** X position (column). Defaults to 0. */
  x?: number;
  /** Y position (row). Defaults to 0. */
  y?: number;
}

/**
 * Auto rendering bounds - automatic sizing with optional constraints.
 *
 * Measures content and renders with automatic positioning. Uses current
 * cursor position or specified coordinates. Ideal for flowing content
 * that should adapt to available space.
 */
export interface AutoBounds {
  mode: "auto";
  /** X position (column). Uses current cursor position if not specified. */
  x?: number;
  /** Y position (row). Uses current cursor position if not specified. */
  y?: number;
  /** Maximum width constraint. Defaults to terminal width. */
  maxWidth?: number;
  /** Maximum height constraint. Defaults to terminal height. */
  maxHeight?: number;
}

/**
 * Render options with bounds and cursor configuration.
 *
 * @example
 * ```ts
 * // Fullscreen rendering
 * const fullscreenOpts: RenderOptions = {
 *   bounds: { mode: "fullscreen" },
 *   cursor: { behavior: "after", visibility: "hidden" }
 * };
 *
 * // Manual positioning with exact dimensions
 * const manualOpts: RenderOptions = {
 *   bounds: {
 *     mode: "manual",
 *     width: 80,
 *     height: 24,
 *     x: 10,
 *     y: 5
 *   },
 *   cursor: { behavior: "preserve", visibility: "visible" }
 * };
 *
 * // Auto sizing with constraints
 * const autoOpts: RenderOptions = {
 *   bounds: {
 *     mode: "auto",
 *     maxWidth: 120
 *   },
 *   cursor: { behavior: "after", visibility: "visible" }
 * };
 * ```
 */
export interface RenderOptions {
  /** Bounds configuration defining where and how to render. Defaults to auto mode. */
  bounds?: RenderBounds;
  /** Cursor configuration for positioning and visibility. */
  cursor?: CursorConfig;
}

export interface RenderResult {
  bounds: {
    used: Rect;
    clipped: Rect;
  };
  stats: {
    cellsWritten: number;
    cellsSkipped: number;
    renderTime: number;
  };
}

interface LayoutContext {
  origin: { x: number; y: number };
  constraints: Constraints;
  viewport: { width: number; height: number };
}

function cloneSnapshot(snapshot: StyleSnapshot): StyleSnapshot {
  return {
    foreground: snapshot.foreground,
    background: snapshot.background,
    bold: snapshot.bold,
    italic: snapshot.italic,
    underline: snapshot.underline,
    faint: snapshot.faint,
  };
}

export class Renderer {
  readonly terminal: TerminalDriver;
  private readonly buffer = new CellBuffer();
  private width: number;
  private height: number;
  private initialCursorPosition: { x: number; y: number } | null = null;

  constructor(options?: {
    width?: number;
    height?: number;
    terminal?: TerminalDriver;
  }) {
    this.width = options?.width ?? process.stdout.columns;
    this.height = options?.height ?? process.stdout.rows;
    this.terminal = options?.terminal ?? new TerminalDriver();
  }

  /**
   * Renders a widget tree to the terminal with the specified options.
   *
   * @param root - The root widget node to render
   * @param options - Rendering configuration options
   * @returns Render result with bounds and performance statistics
   *
   * @example
   * ```ts
   * const result = renderer.render(myWidget, {
   *   bounds: {
   *     mode: "auto",
   *     maxWidth: 80
   *   },
   *   cursor: { behavior: "after", visibility: "visible" }
   * });
   *
   * console.log(`Rendered ${result.stats.cellsWritten} cells in ${result.stats.renderTime}ms`);
   * ```
   */
  render(root: Node, options: RenderOptions): RenderResult {
    const start = performance.now();
    const bounds = options.bounds ?? { mode: "auto" };
    const cursorBehavior = options.cursor?.behavior ?? "after";
    const cursorVisibility = options.cursor?.visibility ?? "visible";
    let originalCursorPosition: { x: number; y: number } | null = null;

    // Capture original cursor position if we need to preserve it
    if (cursorBehavior === "preserve" && bounds.mode !== "fullscreen") {
      originalCursorPosition = this.terminal.getCurrentCursorPosition();
    }

    // Setup terminal for rendering
    if (bounds.mode === "fullscreen") {
      this.terminal.write("\x1b[2J\x1b[H\x1b[?25l"); // Clear screen, move to home, hide cursor
      this.initialCursorPosition = null; // Reset for fullscreen mode
    } else {
      this.terminal.write("\x1b[?25l"); // Hide cursor only
    }

    const context = this.createContext(bounds);

    const inherited = createDefaultStyle();
    const measured = root._measure(context.constraints, inherited);
    const layoutSize = {
      width: Math.min(measured.width, context.viewport.width),
      height: Math.min(measured.height, context.viewport.height),
    };

    if (bounds.mode === "fullscreen") {
      layoutSize.width = context.viewport.width;
      layoutSize.height = context.viewport.height;
    }

    // Handle terminal scrolling when content would render beyond the screen
    // This is crucial for proper rendering when the cursor is near the bottom
    const contentBottom = context.origin.y + layoutSize.height;
    if (contentBottom > this.height && bounds.mode !== "fullscreen") {
      // Calculate how many lines we need to scroll to fit the content
      const linesToScroll = contentBottom - this.height;

      // Scroll the terminal by writing newlines directly to stdout
      // This must be done BEFORE any positioned writes to maintain coordinate system
      process.stdout.write("\n".repeat(linesToScroll));

      // Note: We don't adjust context.origin.y because the coordinate system remains the same
      // after scrolling - we just made more room at the bottom of the terminal

      // Update cached cursor positions so they remain valid after scrolling
      if (this.initialCursorPosition) {
        this.initialCursorPosition.y -= linesToScroll;
      }
      if (originalCursorPosition) {
        originalCursorPosition.y -= linesToScroll;
      }
    }

    root._layout(context.origin, layoutSize);
    const paint = root._paint();
    const cells = this.buildCells(paint);
    this.buffer.bounds = {
      x: context.origin.x,
      y: context.origin.y,
      width: layoutSize.width,
      height: layoutSize.height,
    };

    const diff = diffCells(this.buffer.cells, cells);
    this.buffer.cells.clear();
    for (const [key, cell] of cells.entries()) {
      this.buffer.cells.set(key, cell);
    }

    // Write diff to terminal
    for (const write of diff.writes) {
      if (write.cell) {
        const styleAnsi = styleToAnsi(write.cell.style);
        // Move cursor to position, apply styling, write character, then reset
        this.terminal.write(
          `\x1b[${write.y + 1};${write.x + 1}H${styleAnsi}${write.cell.char}${resetAnsi()}`,
        );
      } else {
        // Clear cell by writing a space with reset styling
        this.terminal.write(
          `\x1b[${write.y + 1};${write.x + 1}H${resetAnsi()} ${resetAnsi()}`,
        );
      }
    }

    // Position cursor based on cursor behavior
    this.applyCursorBehavior(
      cursorBehavior,
      bounds,
      context,
      layoutSize,
      originalCursorPosition,
    );

    // Show or hide cursor based on visibility setting
    if (cursorVisibility === "visible") {
      this.terminal.write("\x1b[?25h"); // Show cursor
    }

    const output = this.terminal.flush();
    if (output) {
      process.stdout.write(output);
    }

    const usedRect: Rect = {
      x: context.origin.x,
      y: context.origin.y,
      width: layoutSize.width,
      height: layoutSize.height,
      style: cloneSnapshot(DEFAULT_STYLE_SNAPSHOT),
    };

    const clippedRect: Rect = {
      x: context.origin.x,
      y: context.origin.y,
      width: context.viewport.width,
      height: context.viewport.height,
      style: cloneSnapshot(DEFAULT_STYLE_SNAPSHOT),
    };

    const end = performance.now();
    return {
      bounds: {
        used: usedRect,
        clipped: clippedRect,
      },
      stats: {
        cellsWritten: diff.writes.length,
        cellsSkipped: diff.skips,
        renderTime: end - start,
      },
    };
  }

  clear(): void {
    this.buffer.clear();
    this.terminal.clear();
    this.terminal.invalidateCursorCache();
    this.initialCursorPosition = null;
    process.stdout.write("\x1b[2J\x1b[H"); // Clear screen and move cursor to home
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.buffer.bounds = { x: 0, y: 0, width, height };
    this.terminal.invalidateCursorCache();
    this.initialCursorPosition = null;
    // Clear the screen and buffer to force complete re-render
    this.buffer.clear();
    this.terminal.clear();
    process.stdout.write("\x1b[2J\x1b[H"); // Clear screen and move cursor to home
  }

  private applyCursorBehavior(
    cursorBehavior: CursorBehavior,
    bounds: RenderBounds,
    context: LayoutContext,
    layoutSize: { width: number; height: number },
    originalCursorPosition: { x: number; y: number } | null,
  ): void {
    switch (cursorBehavior) {
      case "preserve":
        if (originalCursorPosition && bounds.mode !== "fullscreen") {
          this.terminal.write(
            `\x1b[${originalCursorPosition.y + 1};${originalCursorPosition.x + 1}H`,
          );
        }
        break;
      case "after":
        if (bounds.mode === "auto" || bounds.mode === "manual") {
          // Move cursor to the line after the rendered content
          const cursorY = context.origin.y + layoutSize.height;
          const cursorX = context.origin.x;

          // Clamp cursor position to terminal bounds
          const clampedY = Math.min(cursorY, this.height - 1);
          this.terminal.write(`\x1b[${clampedY + 1};${cursorX + 1}H`);
        } else if (bounds.mode === "fullscreen") {
          // In fullscreen mode, position cursor at bottom-left
          this.terminal.write(`\x1b[${this.height};1H`);
        }
        break;
    }
  }

  private createContext(bounds: RenderBounds): LayoutContext {
    switch (bounds.mode) {
      case "fullscreen":
        return {
          origin: { x: 0, y: 0 },
          constraints: constraints(0, this.width, 0, this.height),
          viewport: { width: this.width, height: this.height },
        };
      case "manual": {
        return {
          origin: { x: bounds.x ?? 0, y: bounds.y ?? 0 },
          constraints: constraints(0, bounds.width, 0, bounds.height),
          viewport: { width: bounds.width, height: bounds.height },
        };
      }
      case "auto": {
        const maxWidth = bounds.maxWidth ?? this.width;
        const maxHeight = bounds.maxHeight ?? this.height;

        let origin: { x: number; y: number };
        if (bounds.x !== undefined && bounds.y !== undefined) {
          // Use explicitly provided coordinates
          origin = { x: bounds.x, y: bounds.y };
        } else if (this.initialCursorPosition) {
          // Use cached initial cursor position for subsequent renders
          origin = this.initialCursorPosition;
        } else {
          // Get current cursor position for first render
          const cursorPos = this.terminal.getCurrentCursorPosition();
          this.initialCursorPosition = cursorPos;
          origin = cursorPos;
        }

        return {
          origin,
          constraints: constraints(0, maxWidth, 0, maxHeight),
          viewport: { width: maxWidth, height: maxHeight },
        };
      }
      default:
        throw new Error(`Unknown render mode: ${String((bounds as any).mode)}`);
    }
  }

  private buildCells(paint: PaintResult): Map<string, Cell> {
    const cells = new Map<string, Cell>();
    for (const rect of paint.rects) {
      const style = rect.style;
      for (let y = rect.y; y < rect.y + rect.height; y++) {
        for (let x = rect.x; x < rect.x + rect.width; x++) {
          cells.set(`${x},${y}`, { char: " ", style });
        }
      }
    }

    for (const span of paint.spans) {
      for (let i = 0; i < span.text.length; i++) {
        const char = span.text[i];
        if (!char || char === "\n") {
          continue;
        }
        const x = span.x + i;
        const y = span.y;
        cells.set(`${x},${y}`, { char, style: span.style });
      }
    }

    return cells;
  }
}
