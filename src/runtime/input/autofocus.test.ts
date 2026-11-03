import { expect, test } from "bun:test";

import type { App, Child } from "../../../index";

import {
  button,
  column,
  createApp,
  input,
  keyEvent,
  MemoryTerminal,
  overlay,
  textarea,
  useState,
} from "../../../index";

async function session(
  view: () => Child,
  check: (terminal: MemoryTerminal, app: App) => Promise<void>,
): Promise<void> {
  const terminal = new MemoryTerminal(40, 8);
  const app = createApp(view, { terminal });
  const running = app.run();
  try {
    await Bun.sleep(0);
    await check(terminal, app);
  } finally {
    app.stop();
    await running;
  }
}

for (const factory of [input, textarea]) {
  for (const controlled of [false, true]) {
    test.each([false, true])(
      `${factory.name} autofocus with controlled=${controlled}, select=%s`,
      async (select) => {
        const initial = "café 界🙂\né";
        function Editor(): Child {
          const [value, onChange] = useState(initial);
          return factory(
            controlled ? { value, onChange } : { defaultValue: initial },
          ).autoFocus(select ? { select: true } : true);
        }
        await session(Editor, async (terminal, app) => {
          terminal.dispatch({
            type: "key",
            event: keyEvent("!", { text: "!" }),
          });
          await app.flush();
          expect(terminal.screen?.toString()).toContain(select ? "!" : "é!");
          if (select) expect(terminal.screen?.toString()).not.toContain("café");
          terminal.dispatch({
            type: "key",
            event: keyEvent("?", { text: "?" }),
          });
          await app.flush();
          expect(terminal.screen?.toString()).toContain(select ? "!?" : "é!?");
        });
      },
    );
  }
}

test("Tab preserves an autofocused editor's cursor and selection", async () => {
  await session(
    () =>
      column(
        input({ defaultValue: "abc" }).autoFocus({ select: true }),
        button("Next", () => {}),
      ),
    async (terminal, app) => {
      terminal.dispatch({ type: "key", event: keyEvent("left") });
      terminal.dispatch({
        type: "key",
        event: keyEvent("right", { shift: true }),
      });
      terminal.dispatch({ type: "key", event: keyEvent("tab") });
      terminal.dispatch({ type: "key", event: keyEvent("tab") });
      terminal.dispatch({ type: "key", event: keyEvent("!", { text: "!" }) });
      await app.flush();
      expect(terminal.screen?.toString()).toContain("!bc");
    },
  );
});

test("disabled and opted-out editors do not take automatic focus", async () => {
  await session(
    () =>
      column(
        input({ defaultValue: "disabled", disabled: true }).autoFocus({
          select: true,
        }),
        input({ defaultValue: "opted out" }).autoFocus(false),
        input({ defaultValue: "active" }).autoFocus(),
      ),
    async (terminal, app) => {
      terminal.dispatch({ type: "key", event: keyEvent("!", { text: "!" }) });
      await app.flush();
      expect(terminal.screen?.toString()).toContain("active!");
      expect(terminal.screen?.toString()).toContain("disabled\nopted out");
    },
  );
});

test("modal autofocus selects the current editor value", async () => {
  await session(
    () =>
      overlay({
        modal: true,
        content: input({ defaultValue: "replace me" }).autoFocus({
          select: true,
        }),
      }),
    async (terminal, app) => {
      terminal.dispatch({ type: "key", event: keyEvent("!", { text: "!" }) });
      await app.flush();
      expect(terminal.screen?.toString()).toContain("!");
      expect(terminal.screen?.toString()).not.toContain("replace me");
    },
  );
});
