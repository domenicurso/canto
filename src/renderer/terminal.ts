export class TerminalDriver {
  private buffer = "";
  private cachedCursorPosition: { x: number; y: number } | null = null;

  write(data: string): void {
    this.buffer += data;
  }

  flush(): string {
    const output = this.buffer;
    this.buffer = "";
    return output;
  }

  clear(): void {
    this.buffer = "";
  }

  getCurrentCursorPosition(): { x: number; y: number } {
    if (this.cachedCursorPosition) {
      return this.cachedCursorPosition;
    }

    // Query cursor position using ANSI escape sequence
    try {
      const fs = require("node:fs");

      // Save current raw mode state and set to raw mode if needed
      const wasRawMode = process.stdin.isRaw;
      if (process.stdin.isTTY && !wasRawMode) {
        process.stdin.setRawMode(true);
      }

      // Send cursor position query
      process.stdout.write("\x1b[6n");

      // Read response synchronously
      let response = "";
      let buffer = Buffer.alloc(1);

      // Read until we get the full response (ends with 'R')
      while (true) {
        const bytesRead = fs.readSync(process.stdin.fd, buffer, 0, 1, null);
        if (bytesRead > 0) {
          response += buffer.toString();
          if (response.endsWith("R")) {
            break;
          }
        }
      }

      // Reset stdin to original state
      if (process.stdin.isTTY && !wasRawMode) {
        process.stdin.setRawMode(false);
      }

      // Parse response: \x1b[row;colR
      const match = response.match(/\x1b\[(\d+);(\d+)R/);
      if (match) {
        const row = parseInt(match[1] || "0", 10);
        const col = parseInt(match[2] || "0", 10);
        // Convert from 1-based terminal coordinates to 0-based
        this.cachedCursorPosition = { x: col - 1, y: row - 1 };
        return this.cachedCursorPosition;
      }
    } catch (error) {
      // If we can't get cursor position, fallback to 0,0
    }

    // Fallback to origin
    this.cachedCursorPosition = { x: 0, y: 0 };
    return this.cachedCursorPosition;
  }

  invalidateCursorCache(): void {
    this.cachedCursorPosition = null;
  }
}
