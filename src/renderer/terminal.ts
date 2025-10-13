export class TerminalDriver {
  private buffer = "";

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
}
