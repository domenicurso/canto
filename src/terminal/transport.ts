import type { Screen } from "../render/screen";
import type { ColorTheme } from "../style/colors";
import type { CellSize } from "./cell-size";
import type { Clipboard } from "./clipboard";
import type { TerminalEvent } from "./events";
import type { GraphicsCapabilities } from "./graphics-capabilities";

export type Mode = "fullscreen" | "inline";
export interface Terminal {
  readonly width: number;
  readonly height: number;
  readonly cellSize?: CellSize;
  readonly theme?: ColorTheme;
  readonly graphics?: GraphicsCapabilities;
  readonly clipboard?: Clipboard;
  setMouseTracking?(enabled: boolean): Promise<void>;
  start(mode: Mode, emit: (event: TerminalEvent) => void): Promise<void>;
  present(screen: Screen, output: string): Promise<void>;
  stop(): Promise<void>;
}
export class MemoryTerminal implements Terminal {
  theme?: ColorTheme;
  graphics: GraphicsCapabilities = { kitty: false, sixel: false };
  readonly frames: Screen[] = [];
  readonly output: string[] = [];
  clipboardText = "";
  readonly clipboard: Clipboard = {
    writeText: async (text) => {
      this.clipboardText = text;
    },
    readText: async () => this.clipboardText,
  };
  mouseTracking = true;
  async setMouseTracking(enabled: boolean): Promise<void> {
    this.mouseTracking = enabled;
  }
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
