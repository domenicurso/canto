import type { Screen } from "../render/screen";
import type { CellSize } from "./capabilities/cell-size";
import type { TerminalEvent } from "./input/events";
import type { Mode, Terminal } from "./transport";

import { CellMetrics } from "./capabilities/cell-size";
import { graphicsQuery } from "./capabilities/graphics";
import { TerminalColors, themeQuery } from "./capabilities/theme";
import { clipboardOutput } from "./clipboard";
import { Decoder } from "./input/decoder";
import { InputTimeout } from "./input/input-timeout";
import { keyboardStart, keyboardStop } from "./input/keys";
import { Presentation } from "./output/presentation";

let owner: ProcessTerminal | undefined;
export class ProcessTerminal implements Terminal {
  readonly graphics = { kitty: false, sixel: false };
  private readonly colors = new TerminalColors();
  get theme() {
    return this.colors.theme;
  }
  private readonly output = new Presentation();
  get presentation() {
    return this.output.stats;
  }
  readonly clipboard = {
    writeText: async (text: string): Promise<void> => {
      if (!this.started || !process.stdout.isTTY)
        throw new Error("Clipboard requires an active terminal session.");
      await this.write(clipboardOutput(text));
    },
  };
  private mode: Mode = "fullscreen";
  private raw = false;
  private paused = true;
  private started = false;
  private keyboardOwned = false;
  private input: InputTimeout | undefined;
  private emit: ((event: TerminalEvent) => void) | undefined;
  private origin: number | undefined;
  private readonly metrics = new CellMetrics();
  private queryMetrics = true;
  private report: ((row: number) => void) | undefined;
  get width(): number {
    return process.stdout.columns || 80;
  }
  get height(): number {
    return process.stdout.rows || 24;
  }
  get cellSize(): CellSize {
    return this.metrics.size(this.width, this.height);
  }
  private data = (bytes: Buffer): void => {
    this.input?.push(bytes);
  };
  private resize = (): void => {
    this.output.inline.invalidate();
    this.metrics.invalidate();
    this.queryMetrics = true;
    this.origin = undefined;
    this.emit?.({ type: "resize" });
  };
  async start(mode: Mode, emit: (event: TerminalEvent) => void): Promise<void> {
    if (owner)
      throw new Error("The terminal already belongs to a running Canto app.");
    // oxlint-disable-next-line typescript/no-this-alias -- The process terminal must have one explicit session owner.
    owner = this;
    this.started = true;
    this.mode = mode;
    this.emit = emit;
    this.input = new InputTimeout(this.createDecoder(emit));
    this.raw = process.stdin.isRaw ?? false;
    this.paused = process.stdin.readableFlowing !== true;
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
    }
    process.stdin.on("data", this.data);
    process.stdout.on("resize", this.resize);
    if (process.stdout.isTTY && mode === "inline") await this.locate();
    if (process.stdout.isTTY) {
      this.keyboardOwned = true;
      await this.write(
        (mode === "fullscreen" ? "\x1b[?1049h\x1b[2J\x1b[H" : "\r\x1b7") +
          "\x1b[?25l\x1b[?2004h\x1b[?1003h\x1b[?1006h" +
          keyboardStart +
          graphicsQuery +
          themeQuery,
      );
    }
  }
  private createDecoder(emit: (event: TerminalEvent) => void): Decoder {
    return new Decoder(
      (event) => {
        if (event.type === "mouse" && this.mode === "inline") {
          if (this.origin === undefined) return;
          event = {
            type: "mouse",
            event: { ...event.event, y: event.event.y - this.origin },
          };
        }
        emit(event);
      },
      (row) => {
        this.origin = row;
        this.report?.(row);
      },
      (report) => {
        this.metrics.report(report);
        emit({ type: "resize" });
      },
      {
        graphics: (reply) => {
          if (!this.graphics[reply]) {
            this.graphics[reply] = true;
            emit({ type: "resize" });
          }
        },
        theme: (report) => {
          if (this.colors.report(report)) emit({ type: "resize" });
        },
      },
    );
  }
  async setMouseTracking(enabled: boolean): Promise<void> {
    if (this.started && process.stdout.isTTY)
      await this.write(
        enabled
          ? "\x1b[?1003h\x1b[?1006h"
          : "\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1006l",
      );
  }
  async present(screen: Screen, output: string): Promise<void> {
    if (!process.stdout.isTTY) {
      await this.write(screen.toString() + "\n");
      return;
    }
    const query = this.queryMetrics ? "\x1b[16t\x1b[14t" : "";
    this.queryMetrics = false;
    await this.output.present(screen, output, {
      mode: this.mode,
      height: this.height,
      query,
      write: (value) => this.write(value),
    });
  }

  async stop(): Promise<void> {
    if (!this.started) return;
    this.started = false;
    this.input?.dispose();
    process.stdin.off("data", this.data);
    process.stdout.off("resize", this.resize);
    if (process.stdin.isTTY) process.stdin.setRawMode(this.raw);
    if (this.paused) process.stdin.pause();
    if (owner === this) owner = undefined;
    const keyboard = this.keyboardOwned ? keyboardStop : "";
    this.keyboardOwned = false;
    if (process.stdout.isTTY)
      await this.write(
        this.output.stop() +
          keyboard +
          "\x1b[?2026l\x1b[0m\x1b[?2004l\x1b[?1003l\x1b[?1006l\x1b[?25h" +
          (this.mode === "fullscreen"
            ? "\x1b[?1049l"
            : this.output.inline.stop()),
      );
  }
  private async locate(): Promise<void> {
    let finish: (() => void) | undefined;
    const reply = new Promise<void>((resolve) => {
      finish = resolve;
    });
    this.report = () => finish?.();
    const timer = setTimeout(() => finish?.(), 50);
    try {
      await this.write("\x1b[6n");
      await reply;
    } finally {
      clearTimeout(timer);
      this.report = undefined;
    }
  }
  private async write(output: string): Promise<void> {
    if (!output) return;
    await new Promise<void>((resolve, reject) =>
      process.stdout.write(output, (error) =>
        error ? reject(error) : resolve(),
      ),
    );
  }
}
