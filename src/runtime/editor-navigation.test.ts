import { expect, test } from "bun:test";

import type { KeyEvent } from "../../index";

import {
  createApp,
  input,
  keyEvent,
  MemoryTerminal,
  textarea,
} from "../../index";

async function edited(
  value: string,
  actions: KeyEvent[],
  multiline = false,
): Promise<string> {
  const terminal = new MemoryTerminal(50, 8);
  let result = value;
  const props = {
    defaultValue: value,
    onChange: (next: string) => {
      result = next;
    },
  };
  const app = createApp(
    () => (multiline ? textarea(props) : input(props)).fill().autoFocus(),
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    for (const event of actions) terminal.dispatch({ type: "key", event });
    await app.flush();
    return result;
  } finally {
    app.stop();
    await running;
  }
}
const replace = () => keyEvent("!", { text: "!" });
test.each(["ctrl", "alt"] as const)(
  "%s arrows navigate by Unicode words and Shift extends the selection",
  async (modifier) => {
    const options = { [modifier]: true };
    expect(
      await edited("one café 界 two", [
        keyEvent("right", options),
        keyEvent("right", { ...options, shift: true }),
        replace(),
      ]),
    ).toBe("one! 界 two");
    expect(
      await edited("one café", [
        keyEvent("end"),
        keyEvent("left", { ...options, shift: true }),
        replace(),
      ]),
    ).toBe("one !");
  },
);
test("Home/End select line boundaries and Ctrl+Home/End select document boundaries", async () => {
  expect(
    await edited(
      "first\nsecond",
      [
        keyEvent("end", { ctrl: true }),
        keyEvent("home", { shift: true }),
        replace(),
      ],
      true,
    ),
  ).toBe("first\n!");
  expect(
    await edited(
      "first\nsecond",
      [
        keyEvent("end", { ctrl: true }),
        keyEvent("home", { ctrl: true, shift: true }),
        replace(),
      ],
      true,
    ),
  ).toBe("!");
  expect(
    await edited(
      "first\nsecond",
      [keyEvent("end", { ctrl: true, shift: true }), replace()],
      true,
    ),
  ).toBe("!");
});
test("Meta arrows navigate line/document boundaries with optional Shift", async () => {
  expect(
    await edited(
      "first\nsecond",
      [keyEvent("right", { meta: true, shift: true }), replace()],
      true,
    ),
  ).toBe("!\nsecond");
  expect(
    await edited(
      "first\nsecond",
      [
        keyEvent("down", { meta: true }),
        keyEvent("up", { meta: true, shift: true }),
        replace(),
      ],
      true,
    ),
  ).toBe("!");
});
test("unmodified arrows collapse a selection to its edge without taking another step", async () => {
  expect(
    await edited("abcde", [
      keyEvent("right", { shift: true }),
      keyEvent("right", { shift: true }),
      keyEvent("left"),
      replace(),
    ]),
  ).toBe("!abcde");
  expect(
    await edited("abcde", [
      keyEvent("right", { shift: true }),
      keyEvent("right", { shift: true }),
      keyEvent("right"),
      replace(),
    ]),
  ).toBe("ab!cde");
});
test("Alt+B/F word navigation and Ctrl/Alt vertical paragraph movement preserve source boundaries", async () => {
  expect(
    await edited("one two", [
      keyEvent("f", { alt: true }),
      keyEvent("f", { alt: true }),
      keyEvent("b", { alt: true, shift: true }),
      replace(),
    ]),
  ).toBe("one !");
  expect(
    await edited(
      "first\n\nsecond\n\nthird",
      [
        keyEvent("down", { ctrl: true }),
        keyEvent("down", { alt: true, shift: true }),
        replace(),
      ],
      true,
    ),
  ).toBe("first\n\n!third");
});
