import { Terminal as Emulator } from "@xterm/headless";
import { expect, test } from "bun:test";

import type { TerminalEvent } from "./events";
import type { Mode, Terminal } from "./transport";

import { column, createApp, text, useState } from "../../index";
import { diff } from "../render/diff";
import { Screen } from "../render/screen";
import { InlineRegion } from "./inline-region";

class InlineTerminal implements Terminal {
  readonly emulator = new Emulator({
    cols: 40,
    rows: 16,
    scrollback: 100,
    convertEol: true,
    allowProposedApi: true,
  });
  readonly region = new InlineRegion();
  private emit?: (event: TerminalEvent) => void;
  screen?: Screen;
  origin = 0;
  constructor() {
    this.emulator.onData((data) => {
      const report = /^\x1b\[(\d+);\d+R$/.exec(data);
      if (report) this.origin = Number(report[1]) - 1;
    });
  }
  get width(): number {
    return this.emulator.cols;
  }
  get height(): number {
    return this.emulator.rows;
  }
  async write(output: string): Promise<void> {
    await new Promise<void>((resolve) => this.emulator.write(output, resolve));
  }
  async start(
    _mode: Mode,
    emit: (event: TerminalEvent) => void,
  ): Promise<void> {
    this.emit = emit;
    await this.write("shell prompt\r\n$ bun example.ts\r\n\x1b7\x1b[6n");
  }
  async present(screen: Screen, output: string): Promise<void> {
    this.screen = screen;
    await this.write(this.region.present(screen.height, output, this.height));
  }
  async stop(): Promise<void> {
    await this.write(this.region.stop());
    this.emulator.dispose();
  }
  resize(width: number, height: number): void {
    this.emulator.resize(width, height);
    this.region.invalidate();
    this.emit?.({ type: "resize" });
  }
  visible(): string[] {
    const buffer = this.emulator.buffer.active;
    return Array.from(
      { length: this.height },
      (_, row) =>
        buffer
          .getLine(buffer.baseY + row)
          ?.translateToString(true)
          .trimEnd() ?? "",
    );
  }
  expectFrame(): void {
    expect(this.screen).toBeDefined();
    const expected = this.screen?.toString().split("\n") ?? [];
    expect(
      this.visible().slice(this.origin, this.origin + expected.length),
    ).toEqual(expected);
    expect(
      this.visible()
        .slice(this.origin + expected.length)
        .every((line) => !line.trim()),
    ).toBe(true);
    this.expectBackgrounds();
  }
  private expectBackgrounds(): void {
    const buffer = this.emulator.buffer.active;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = buffer.getLine(buffer.baseY + y)?.getCell(x);
        const expected =
          y >= this.origin && y < this.origin + (this.screen?.height ?? 0)
            ? this.screen?.get(x, y - this.origin)?.style.background
            : undefined;
        if (expected === "red" || expected === "cyan") {
          expect(cell?.getBgColor()).toBe(expected === "red" ? 1 : 6);
        } else
          expect({
            x,
            y,
            size: `${this.width}x${this.height}`,
            origin: this.origin,
            color: cell?.getBgColor(),
            default: cell?.isBgDefault(),
          }).toMatchObject({ default: true });
      }
    }
  }
}
test("inline output clears shrinking frames and survives narrow, short, and expanding terminals", async () => {
  const terminal = new InlineTerminal();
  let update = (_value: number): void => {};
  const app = createApp(
    () => {
      const [count, setCount] = useState(28);
      update = setCount;
      return column(
        text("Live Data Feed").background("red").padding([1, 2]),
        column(
          text(`A: ${"#".repeat(count)}`),
          text(`B: ${"#".repeat(count * 2)}`),
        )
          .background("cyan")
          .padding([1, 2]),
        text("Ctrl+C to exit"),
      ).gap(1);
    },
    { terminal, mode: "inline" },
  );
  const running = app.run();
  try {
    for (let attempt = 0; attempt < 100 && !terminal.screen; attempt++)
      await Bun.sleep(1);
    await app.flush();
    terminal.expectFrame();
    for (const [width, height] of [
      [18, 16],
      [12, 6],
      [6, 3],
      [1, 1],
      [30, 8],
      [60, 24],
      [20, 12],
    ]) {
      terminal.resize(width ?? 1, height ?? 1);
      await app.flush();
      terminal.expectFrame();
      update(3);
      await app.flush();
      terminal.expectFrame();
      update(28);
      await app.flush();
      terminal.expectFrame();
    }
  } finally {
    app.stop();
    await running;
  }
});
test("a single-row inline reservation never emits a zero-distance cursor move", async () => {
  const terminal = new InlineTerminal();
  await terminal.start("inline", () => {});
  const first = new Screen(40, 1);
  first.put(
    { x: 0, y: 0, width: 40, height: 1 },
    "first",
    {},
    { x: 0, y: 0, width: 40, height: 1 },
  );
  const output = terminal.region.present(
    1,
    diff(undefined, first).output,
    terminal.height,
  );
  expect(output).not.toContain("[0B");
  await terminal.write(output);
  expect(terminal.visible().slice(0, 3)).toEqual([
    "shell prompt",
    "$ bun example.ts",
    "first",
  ]);
  expect(terminal.region.stop()).not.toContain("[0B");
  await terminal.stop();
});
