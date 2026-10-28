import { createApp, MemoryTerminal, text, useEffect, useState } from "../../index";
import { expect, test } from "bun:test";

import type { Mode, TerminalEvent } from "../../index";
import type { Screen } from "../render/screen";

class SlowTerminal extends MemoryTerminal {
  releases: Array<() => void> = [];
  override async present(screen: Screen, output: string): Promise<void> {
    await new Promise<void>((resolve) => {
      this.releases.push(resolve);
    });
    await super.present(screen, output);
  }
}
test("output backpressure serializes frames and coalesces intervening state changes", async () => {
  const terminal = new SlowTerminal(20, 3);
  let update = (_value: number): void => {};
  const app = createApp(
    () => {
      const [count, setCount] = useState(0);
      update = setCount;
      return text(count);
    },
    { terminal },
  );
  const running = app.run();
  await Bun.sleep(0);
  update(1);
  update(2);
  update(3);
  expect(terminal.releases).toHaveLength(1);
  terminal.releases[0]?.();
  await Bun.sleep(0);
  expect(terminal.releases).toHaveLength(2);
  terminal.releases[1]?.();
  await Bun.sleep(0);
  expect(terminal.screen?.toString().trim()).toBe("3");
  app.stop();
  await running;
});
test("startup failure releases the terminal and retains its original cause", async () => {
  class BrokenTerminal extends MemoryTerminal {
    override async start(_mode: Mode, _emit: (event: TerminalEvent) => void): Promise<void> {
      throw new Error("cannot acquire terminal");
    }
  }
  const terminal = new BrokenTerminal();
  const app = createApp(() => text("never mounted"), { terminal });
  await expect(app.run()).rejects.toThrow("cannot acquire terminal");
  expect(terminal.stopped).toBe(true);
});
test("paint-only styles skip layout while content changes invalidate it", async () => {
  const terminal = new MemoryTerminal();
  let recolor = (): void => {};
  let changeText = (): void => {};
  const app = createApp(
    () => {
      const [red, setRed] = useState(false);
      const [label, setLabel] = useState("hello");
      recolor = () => setRed(true);
      changeText = () => setLabel("longer content");
      return text(label).color(red ? "red" : "green");
    },
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    recolor();
    await app.flush();
    await Bun.sleep(0);
    expect(app.stats.layoutTime).toBe(0);
    expect(terminal.screen?.get(0, 0)?.style.foreground).toBe("red");
    changeText();
    await app.flush();
    await Bun.sleep(0);
    expect(app.stats.layoutTime).toBeGreaterThan(0);
  } finally {
    app.stop();
    await running;
  }
});
test("adding a conditional hook fails explicitly and restores the terminal", async () => {
  const terminal = new MemoryTerminal();
  let update = (): void => {};
  const app = createApp(
    () => {
      const [extra, setExtra] = useState(false);
      update = () => setExtra(true);
      if (extra) useState(0);
      return text("hooks");
    },
    { terminal },
  );
  const running = app.run();
  await Bun.sleep(0);
  update();
  await expect(running).rejects.toThrow("Hook count changed");
  expect(terminal.stopped).toBe(true);
});
test("render errors preserve cleanup for already acquired siblings", async () => {
  const terminal = new MemoryTerminal();
  let cleaned = false;
  const app = createApp(
    () => {
      useEffect(
        () => () => {
          cleaned = true;
        },
        [],
      );
      return text("mounted");
    },
    { terminal },
  );
  const running = app.run();
  await Bun.sleep(0);
  app.stop();
  app.stop();
  await running;
  expect(cleaned).toBe(true);
});
