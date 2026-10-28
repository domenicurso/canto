import type { Screen } from "../render/screen";
import type { CellSize } from "./cell-size";
import type { TerminalEvent } from "./events";

export type Mode = "fullscreen" | "inline";
export interface Terminal {
  readonly width: number;
  readonly height: number;
  readonly cellSize?: CellSize;
  start(mode: Mode, emit: (event: TerminalEvent) => void): Promise<void>;
  present(screen: Screen, output: string): Promise<void>;
  stop(): Promise<void>;
}
export class MemoryTerminal implements Terminal {
  readonly frames: Screen[] = [];
  readonly output: string[] = [];
  started = false;
  stopped = false;
  cellSize: CellSize = { width: 8, height: 16 };
  private emit: ((event: TerminalEvent) => void) | undefined;
  constructor(
    public width = 80,
    public height = 24,
  ) {}
  async start(
    _mode: Mode,
    emit: (event: TerminalEvent) => void,
  ): Promise<void> {
    this.started = true;
    this.emit = emit;
  }
  async present(screen: Screen, output: string): Promise<void> {
    this.frames.push(screen);
    this.output.push(output);
  }
  async stop(): Promise<void> {
    this.stopped = true;
    this.emit = undefined;
  }
  dispatch(event: TerminalEvent): void {
    this.emit?.(event);
  }
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.emit?.({ type: "resize" });
  }
  get screen(): Screen | undefined {
    return this.frames.at(-1);
  }
}
