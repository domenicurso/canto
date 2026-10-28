import { StringDecoder } from "node:string_decoder";

import type { PixelReport } from "./cell-size";
import type { TerminalEvent } from "./events";
import type { GraphicsReply } from "./graphics-capabilities";
import type { ThemeReport } from "./theme";

import { parsePixelReport } from "./cell-size";
import { keyEvent } from "./events";
import { graphicsResponse } from "./graphics-capabilities";
import { decodeKeySequence } from "./keys";
import { themeResponse } from "./theme";

export class Decoder {
  private buffer = "";
  private readonly utf8 = new StringDecoder("utf8");
  constructor(
    private readonly emit: (event: TerminalEvent) => void,
    private readonly cursor?: (row: number) => void,
    private readonly pixels?: (report: PixelReport) => void,
    private readonly reports?:
      | ((reply: GraphicsReply) => void)
      | {
          graphics?: (reply: GraphicsReply) => void;
          theme?: (report: ThemeReport) => void;
        },
  ) {}
  push(bytes: Uint8Array): void {
    this.buffer += this.utf8.write(Buffer.from(bytes));
    this.parse();
  }
  flushEscape(): void {
    if (this.buffer === "\x1b") {
      this.buffer = "";
      this.emit({ type: "key", event: keyEvent("escape") });
    }
  }
  private parse(): void {
    while (this.buffer) {
      if (this.buffer.startsWith("\x1b[200~")) {
        const end = this.buffer.indexOf("\x1b[201~");
        if (end < 0) return;
        this.emit({
          type: "key",
          event: keyEvent("paste", { text: this.buffer.slice(6, end) }),
        });
        this.buffer = this.buffer.slice(end + 6);
        continue;
      }
      const length = this.buffer.startsWith("\x1b")
        ? this.escape()
        : this.character();
      if (!length) return;
      this.buffer = this.buffer.slice(length);
    }
  }
  private escape(): number {
    const theme = themeResponse(this.buffer);
    if (theme) {
      if (typeof this.reports === "object")
        for (const report of theme.reports) this.reports.theme?.(report);
      return theme.length;
    }
    const graphics = graphicsResponse(this.buffer);
    if (graphics) {
      if (graphics.reply) {
        const graphicsHandler =
          typeof this.reports === "function"
            ? this.reports
            : this.reports?.graphics;
        graphicsHandler?.(graphics.reply);
      }
      return graphics.length;
    }
    const mouse = /^\x1b\[<(\d+);(\d+);(\d+)([Mm])/.exec(this.buffer);
    if (mouse) {
      this.mouse(mouse);
      return mouse[0].length;
    }
    const sequence = /^\x1b(?:\[|O)([\d;]*[A-Za-z~])/.exec(this.buffer);
    if (sequence) {
      const token = sequence[1] ?? "";
      const pixelReport = parsePixelReport(token);
      if (pixelReport) {
        this.pixels?.(pixelReport);
        return sequence[0].length;
      }
      const report = /^(\d+);(\d+)R$/.exec(token);
      if (report) {
        this.cursor?.(Number(report[1]) - 1);
        return sequence[0].length;
      }
      const event = decodeKeySequence(token);
      if (event) this.emit({ type: "key", event });
      return sequence[0].length;
    }
    if (this.buffer.length === 1 || /^\x1b(?:\[[<\d;]*|O)$/.test(this.buffer))
      return 0;
    if (this.buffer[1] === "[") return 2;
    const char = Array.from(this.buffer.slice(1))[0] ?? "";
    this.emit({
      type: "key",
      event: keyEvent(char.toLowerCase(), { alt: true, text: char }),
    });
    return 1 + char.length;
  }
  private character(): number {
    const char = Array.from(this.buffer)[0] ?? "";
    const code = char.codePointAt(0) ?? 0;
    const key =
      char === "\r" || char === "\n"
        ? "enter"
        : char === "\t"
          ? "tab"
          : char === "\x7f" || char === "\b"
            ? "backspace"
            : code < 32
              ? String.fromCharCode(code + 96)
              : char;
    this.emit({
      type: "key",
      event: keyEvent(key, {
        ctrl:
          code > 0 && code < 27 && !["enter", "tab", "backspace"].includes(key),
        text: code >= 32 && code !== 127 ? char : undefined,
      }),
    });
    return char.length;
  }
  private mouse(match: RegExpExecArray): void {
    const code = Number(match[1]);
    const wheel = Boolean(code & 64);
    const horizontal = Boolean(code & 2) || Boolean(code & 4);
    const delta = wheel ? (code & 1 ? 1 : -1) : 0;
    this.emit({
      type: "mouse",
      event: {
        x: Number(match[2]) - 1,
        y: Number(match[3]) - 1,
        button: code & 3,
        shift: Boolean(code & 4),
        alt: Boolean(code & 8),
        ctrl: Boolean(code & 16),
        action:
          code & 64
            ? "scroll"
            : code & 32
              ? "move"
              : match[4] === "m"
                ? "release"
                : "press",
        deltaMode: "cell",
        deltaX: horizontal ? delta : 0,
        deltaY: horizontal ? 0 : delta,
      },
    });
  }
}
