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
export type CursorPolicy = "preserve" | "after" | "hide";

export interface RenderOptions {
  mode: RenderMode;
  cursor?: CursorPolicy;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  maxWidth?: number;
  maxHeight?: number;
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
  };
}

export class Renderer {
  private readonly terminal: TerminalDriver;
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

  render(root: Node, options: RenderOptions): RenderResult {
    const start = performance.now();

    // Setup terminal for rendering
    if (options.mode === "fullscreen") {
      this.terminal.write("\x1b[2J\x1b[H\x1b[?25l"); // Clear screen, move to home, hide cursor
      this.initialCursorPosition = null; // Reset for fullscreen mode
    } else {
      this.terminal.write("\x1b[?25l"); // Hide cursor only
    }

    const context = this.createContext(options);

    const inherited = createDefaultStyle();
    const measured = root._measure(context.constraints, inherited);
    const layoutSize = {
      width: Math.min(measured.width, context.viewport.width),
      height: Math.min(measured.height, context.viewport.height),
    };

    if (options.mode === "fullscreen") {
      layoutSize.width = context.viewport.width;
      layoutSize.height = context.viewport.height;
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

    // Position cursor appropriately after rendering
    if (options.mode === "auto") {
      // Move cursor to the line after the rendered content
      const cursorY = context.origin.y + layoutSize.height;
      const cursorX = context.origin.x;
      this.terminal.write(`\x1b[${cursorY + 1};${cursorX + 1}H`);
    }

    // Show cursor and flush to stdout
    this.terminal.write("\x1b[?25h"); // Show cursor

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
  }

  private createContext(options: RenderOptions): LayoutContext {
    switch (options.mode) {
      case "fullscreen":
        return {
          origin: { x: 0, y: 0 },
          constraints: constraints(0, this.width, 0, this.height),
          viewport: { width: this.width, height: this.height },
        };
      case "manual": {
        if (options.width === undefined || options.height === undefined) {
          throw new Error("Manual mode requires width and height");
        }
        return {
          origin: { x: options.x ?? 0, y: options.y ?? 0 },
          constraints: constraints(0, options.width, 0, options.height),
          viewport: { width: options.width, height: options.height },
        };
      }
      case "auto": {
        const maxWidth = options.maxWidth ?? this.width;
        const maxHeight = options.maxHeight ?? this.height;

        let origin: { x: number; y: number };
        if (options.x !== undefined && options.y !== undefined) {
          // Use explicitly provided coordinates
          origin = { x: options.x, y: options.y };
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
        throw new Error(`Unknown render mode: ${String(options.mode)}`);
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
