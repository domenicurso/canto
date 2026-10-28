import type { Screen } from "../render/screen";
import type { Mode } from "./transport";

import { diff } from "../render/diff";
import { GraphicsOutput } from "./graphics-output";
import { InlineRegion } from "./inline-region";

export interface PresentationStats {
  encodeTime: number;
  writeTime: number;
  bytes: number;
}
/** Encoding and stream backpressure complete before the presentation sample is published. */
export class Presentation {
  readonly inline = new InlineRegion();
  private readonly images = new GraphicsOutput();
  stats?: Readonly<PresentationStats>;
  async present(
    screen: Screen,
    output: string,
    options: {
      mode: Mode;
      height: number;
      query: string;
      write(output: string): Promise<void>;
    },
  ): Promise<void> {
    const start = performance.now();
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
    if (options.mode === "inline")
      output = this.inline.present(screen.height, output, options.height);
    output = options.query + "\x1b[?2026h" + output + "\x1b[?2026l";
    const bytes = Buffer.byteLength(output);
    const encodeTime = performance.now() - start;
    const writeStart = performance.now();
    await options.write(output);
    this.stats = {
      encodeTime,
      writeTime: performance.now() - writeStart,
      bytes,
    };
  }
  stop(): string {
    return this.images.stop();
  }
}
