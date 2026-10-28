import { inlineOutput } from "./inline";

/** Own the saved cursor and the physical rows reserved in the normal screen buffer. */
export class InlineRegion {
  private rows = 1;
  private resized = false;
  private occupiedViewport = false;
  invalidate(): void {
    this.resized = true;
  }
  present(height: number, output: string, viewportHeight: number): string {
    let prefix = "";
    if (this.resized) {
      // Resizing can reflow lines and move the saved cursor; rebuild the visible reservation.
      // Once content fills the viewport, shrinking can push owned rows into scrollback.
      // A later expansion pulls them back above the saved cursor, requiring a full repaint.
      const clear =
        this.occupiedViewport || this.rows >= viewportHeight
          ? "\x1b[H\x1b[0m\x1b[2J\x1b7"
          : "\x1b8\r\x1b[0m\x1b[J";
      prefix = clear + reserve(1, height);
      this.resized = false;
    } else if (height > this.rows) {
      prefix = "\x1b8" + reserve(this.rows, height);
    } else if (height < this.rows) {
      prefix = "\x1b8" + down(height) + "\r\x1b[0m\x1b[J";
    }
    this.occupiedViewport ||= height >= viewportHeight;
    this.rows = height;
    return prefix + (prefix ? "\x1b8\x1b[6n" : "") + inlineOutput(output);
  }
  stop(): string {
    return "\x1b8" + down(this.rows - 1) + "\r\n";
  }
}
function down(rows: number): string {
  return rows > 0 ? `\x1b[${rows}B` : "";
}
function reserve(previous: number, height: number): string {
  return (
    down(previous - 1) +
    "\r" +
    "\n".repeat(height - previous) +
    (height > 1 ? `\x1b[${height - 1}A` : "") +
    "\r\x1b7"
  );
}
