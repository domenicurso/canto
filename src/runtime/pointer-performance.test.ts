import { expect, test } from "bun:test";

import { column, createApp, MemoryTerminal, text, useState } from "../../index";

function move(terminal: MemoryTerminal, x: number, y: number): void {
  terminal.dispatch({
    type: "mouse",
    event: { action: "move", x, y, button: 0, deltaY: 0 },
  });
}
test("mouse motion within an element and the inspector does not manufacture render frames", async () => {
  const terminal = new MemoryTerminal(80, 24);
  const app = createApp(() => column(text("Body")).fill(), { terminal });
  const running = app.run();
  try {
    await Bun.sleep(0);
    move(terminal, 1, 3);
    await Bun.sleep(0);
    const count = terminal.frames.length;
    for (let burst = 0; burst < 5; burst++) {
      for (let x = 0; x < 80; x++) move(terminal, x, 3);
      await Bun.sleep(0);
    }
    expect(terminal.frames).toHaveLength(count);
    app.debug.toggle();
    await app.flush();
    move(terminal, 60, 22);
    await Bun.sleep(0);
    const inspected = terminal.frames.length;
    for (let burst = 0; burst < 5; burst++) {
      for (let x = 40; x < 70; x++) move(terminal, x, 22);
      await Bun.sleep(0);
    }
    expect(terminal.frames).toHaveLength(inspected);
  } finally {
    app.stop();
    await running;
  }
});
test("motion handlers still receive every event and reactive changes still render", async () => {
  const terminal = new MemoryTerminal(80, 24);
  let events = 0;
  const app = createApp(
    () => {
      const [position, setPosition] = useState(-1);
      return column(text(`Position ${position}`))
        .fill()
        .onMouse((event) => {
          events++;
          if (event.x === 7) setPosition(event.x);
        });
    },
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    move(terminal, 1, 3);
    await Bun.sleep(0);
    const frames = terminal.frames.length;
    for (let burst = 0; burst < 5; burst++) {
      move(terminal, 2, 3);
      await Bun.sleep(0);
    }
    expect(events).toBe(6);
    expect(terminal.frames).toHaveLength(frames);
    move(terminal, 7, 3);
    await Bun.sleep(0);
    expect(terminal.screen?.toString()).toContain("Position 7");
  } finally {
    app.stop();
    await running;
  }
});
