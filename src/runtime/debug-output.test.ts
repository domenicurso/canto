import { expect, test } from "bun:test";

import type { Screen } from "../render/screen";

import { column, createApp, MemoryTerminal, text, useState } from "../../index";

class BlockedTerminal extends MemoryTerminal {
  readonly pending: { screen: Screen; release: () => void }[] = [];
  override async present(screen: Screen, output: string): Promise<void> {
    await new Promise<void>((resolve) =>
      this.pending.push({ screen, release: resolve }),
    );
    await super.present(screen, output);
  }
  release(): void {
    this.pending.shift()?.release();
  }
}
test("backpressure keeps current work and completed output correctly attributed while updates coalesce", async () => {
  const terminal = new BlockedTerminal(80, 24);
  let update = (_count: number): void => {};
  const app = createApp(
    () => {
      const [count, setCount] = useState(0);
      update = setCount;
      return column(text(`Count: ${count}`)).fill();
    },
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    terminal.release();
    await Bun.sleep(0);
    app.debug.setVisible(true);
    await Bun.sleep(0);
    expect(terminal.pending[0]?.screen.toString()).toContain("Content #2");
    expect(terminal.pending[0]?.screen.toString()).toContain("Output #1");
    expect(app.stats.frame).toBe(1);
    update(1);
    update(2);
    update(3);
    await Bun.sleep(15);
    expect(terminal.pending).toHaveLength(1);
    terminal.release();
    await Bun.sleep(0);
    expect(terminal.pending[0]?.screen.toString()).toContain("Content #3");
    expect(terminal.pending[0]?.screen.toString()).toContain("Output #2");
    expect(terminal.pending[0]?.screen.toString()).toMatch(/Changed\s+1\s*│/);
    expect(terminal.pending[0]?.screen.toString()).toContain("Count: 3");
    expect(app.stats.presentTime).toBeGreaterThanOrEqual(10);
    expect(app.stats.renderTime).toBeGreaterThan(app.stats.contentTime);
    terminal.release();
    await Bun.sleep(0);
    expect(app.stats.frame).toBe(3);
    expect(app.stats.contentCellsWritten).toBe(1);
    expect(terminal.pending).toHaveLength(0);
  } finally {
    app.stop();
    terminal.release();
    await running;
  }
});
