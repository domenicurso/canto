import { Decoder } from "./decoder";
import { inlineOutput } from "./inline";

import type { Screen } from "../render/screen";
import type { TerminalEvent } from "./events";
import type { Mode, Terminal } from "./transport";

let owner: ProcessTerminal | undefined;
export class ProcessTerminal implements Terminal {
  private mode: Mode = "fullscreen";
  private raw = false;
  private paused = true;
  private started = false;
  private decoder: Decoder | undefined;
  private escapeTimer: ReturnType<typeof setTimeout> | undefined;
  private emit: ((event: TerminalEvent) => void) | undefined;
  private rows = 1;
  private origin: number | undefined;
  private report: ((row: number) => void) | undefined;
  get width(): number {
    return process.stdout.columns || 80;
  }
  get height(): number {
    return process.stdout.rows || 24;
  }
  private data = (bytes: Buffer): void => {
    this.decoder?.push(bytes);
    clearTimeout(this.escapeTimer);
    this.escapeTimer = setTimeout(() => this.decoder?.flushEscape(), 30);
  };
  private resize = (): void => {
    this.emit?.({ type: "resize" });
  };
  async start(mode: Mode, emit: (event: TerminalEvent) => void): Promise<void> {
    if (owner) throw new Error("The terminal already belongs to a running Canto app.");
    owner = this;
    this.started = true;
    this.mode = mode;
    this.emit = emit;
    this.decoder = new Decoder(
      (event) => {
        if (event.type === "mouse" && this.mode === "inline") {
          if (this.origin === undefined) return;
          event = { type: "mouse", event: { ...event.event, y: event.event.y - this.origin } };
        }
        emit(event);
      },
      (row) => {
        this.origin = row;
        this.report?.(row);
      },
    );
    this.raw = process.stdin.isRaw ?? false;
    this.paused = process.stdin.readableFlowing !== true;
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
    }
    process.stdin.on("data", this.data);
    process.stdout.on("resize", this.resize);
    if (process.stdout.isTTY && mode === "inline") await this.locate();
    if (process.stdout.isTTY)
      await this.write(
        (mode === "fullscreen" ? "\x1b[?1049h\x1b[2J\x1b[H" : "\r\x1b7") +
          "\x1b[?25l\x1b[?2004h\x1b[?1003h\x1b[?1006h",
      );
  }
  async present(screen: Screen, output: string): Promise<void> {
    if (!process.stdout.isTTY) {
      await this.write(screen.toString() + "\n");
      return;
    }
    if (this.mode === "fullscreen") {
      await this.write(output);
      return;
    }
    let reserve = "";
    if (screen.height > this.rows) {
      const additional = screen.height - this.rows;
      reserve =
        "\x1b8" +
        `\x1b[${this.rows - 1}B` +
        "\n".repeat(additional) +
        `\x1b[${screen.height - 1}A\r\x1b7`;
      this.rows = screen.height;
      if (this.origin !== undefined)
        this.origin = Math.min(this.origin, Math.max(0, this.height - screen.height));
    }
    await this.write(reserve + inlineOutput(output));
  }
  async stop(): Promise<void> {
    if (!this.started) return;
    this.started = false;
    clearTimeout(this.escapeTimer);
    process.stdin.off("data", this.data);
    process.stdout.off("resize", this.resize);
    if (process.stdin.isTTY) process.stdin.setRawMode(this.raw);
    if (this.paused) process.stdin.pause();
    if (owner === this) owner = undefined;
    if (process.stdout.isTTY)
      await this.write(
        "\x1b[0m\x1b[?2004l\x1b[?1003l\x1b[?1006l\x1b[?25h" +
          (this.mode === "fullscreen"
            ? "\x1b[?1049l"
            : "\x1b8" + `\x1b[${Math.max(0, this.rows - 1)}B\r\n`),
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
      process.stdout.write(output, (error) => (error ? reject(error) : resolve())),
    );
  }
}
