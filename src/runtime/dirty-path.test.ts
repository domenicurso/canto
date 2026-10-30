import { expect, test } from "bun:test";

import {
  column,
  component,
  createApp,
  MemoryTerminal,
  text,
  useState,
} from "../../index";

test("nested state updates cross stable ancestors without rerendering siblings", async () => {
  const terminal = new MemoryTerminal(20, 4);
  let update = (_value: number): void => {};
  let siblingRenders = 0;
  const Counter = component(() => {
    const [value, setValue] = useState(0);
    update = setValue;
    return text(value);
  });
  const Sibling = component(() => {
    siblingRenders++;
    return text("stable");
  });
  const Parent = component(() => column(Counter(), Sibling()));
  const app = createApp(() => Parent(), { terminal });
  const running = app.run();
  try {
    await Bun.sleep(0);
    update(1);
    await app.flush();
    update(2);
    await app.flush();
    expect(terminal.screen?.toString()).toContain("2\nstable");
    expect(siblingRenders).toBe(1);
    terminal.resize(21, 5);
    await app.flush();
    expect(terminal.screen?.toString()).toContain("2\nstable");
  } finally {
    app.stop();
    await running;
  }
});
