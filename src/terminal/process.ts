import type { Screen } from "../render/screen";
import type { CellSize } from "./cell-size";
import type { TerminalEvent } from "./events";
import type { Mode, Terminal } from "./transport";

import { diff } from "../render/diff";
import { CellMetrics } from "./cell-size";
import { clipboardOutput } from "./clipboard";
import { Decoder } from "./decoder";
import { graphicsQuery } from "./graphics-capabilities";
import { GraphicsOutput } from "./graphics-output";
import { InlineRegion } from "./inline-region";
import { TerminalColors, themeQuery } from "./theme";

let owner: ProcessTerminal | undefined;
export class ProcessTerminal implements Terminal {
  readonly graphics = { kitty: false, sixel: false };
  private readonly colors = new TerminalColors();
  get theme() {
    return this.colors.theme;
  }
  private readonly images = new GraphicsOutput();
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
  private decoder: Decoder | undefined;
  private escapeTimer: ReturnType<typeof setTimeout> | undefined;
  private emit: ((event: TerminalEvent) => void) | undefined;
  private readonly inline = new InlineRegion();
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
    this.decoder?.push(bytes);
    clearTimeout(this.escapeTimer);
    this.escapeTimer = setTimeout(() => this.decoder?.flushEscape(), 30);
  };
  private resize = (): void => {
    this.inline.invalidate();
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
    this.decoder = this.createDecoder(emit);
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
          "\x1b[?25l\x1b[?2004h\x1b[?1003h\x1b[?1006h" +
          graphicsQuery +
          themeQuery,
      );
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
    const rows = Array.from(
      output.matchAll(/\x1b\[(\d+);\d+H/g),
      (match) => Number(match[1]) - 1,
    );
    const native = this.images.update(screen.rasters, rows);
    const cursor =
      output.match(/(?:\x1b\[\d+;\d+H)?\x1b\[\?25[hl]$/)?.[0] ?? "";
    output =
      (native.repaint ? diff(undefined, screen).output : output) +
      native.output +
      cursor;
    const query = this.queryMetrics ? "\x1b[16t\x1b[14t" : "";
    this.queryMetrics = false;
    if (this.mode === "fullscreen") {
      await this.write(query + "\x1b[?2026h" + output + "\x1b[?2026l");
      return;
    }
    await this.write(
      query +
        "\x1b[?2026h" +
        this.inline.present(screen.height, output, this.height) +
        "\x1b[?2026l",
    );
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
        this.images.stop() +
          "\x1b[?2026l\x1b[0m\x1b[?2004l\x1b[?1003l\x1b[?1006l\x1b[?25h" +
          (this.mode === "fullscreen" ? "\x1b[?1049l" : this.inline.stop()),
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
