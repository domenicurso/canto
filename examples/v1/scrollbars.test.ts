import { expect, test } from "bun:test";

import { createApp, keyEvent, MemoryTerminal } from "../../index";
import { Scrollbars } from "./scrollbars";

test("scrollbar demo toggles actual bars and optional inertia", async () => {
  const terminal = new MemoryTerminal(100, 30);
  const app = createApp(Scrollbars, { terminal });
  const running = app.run();
  try {
    await Bun.sleep(0);
    expect(terminal.screen?.toString()).toMatch(/[█▏▎▍▌▋▊▉▁▂▃▄▅▆▇]/);
    terminal.dispatch({ type: "key", event: keyEvent("b") });
    terminal.dispatch({ type: "key", event: keyEvent("i") });
    await app.flush();
    expect(terminal.screen?.toString()).not.toMatch(/[█▏▎▍▌▋▊▉▁▂▃▄▅▆▇]/);
    expect(terminal.screen?.toString()).toContain("inertia on");
    terminal.dispatch({
      type: "mouse",
      event: {
        action: "scroll",
        button: 0,
        x: 4,
        y: 6,
        deltaY: 1,
      },
    });
    await app.flush();
    expect(terminal.screen?.toString()).toContain("Y=1");
    await Bun.sleep(100);
    await app.flush();
    expect(terminal.screen?.toString()).not.toContain("Y=1 ·");
  } finally {
    app.stop();
    await running;
  }
});
