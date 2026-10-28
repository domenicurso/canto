import { expect, test } from "bun:test";

import type { App, Child, ElementRef } from "../../index";

import {
  box,
  column,
  component,
  createApp,
  MemoryTerminal,
  row,
  text,
  useState,
} from "../../index";

async function session(
  view: () => Child,
  check: (terminal: MemoryTerminal, app: App) => Promise<void>,
): Promise<void> {
  const terminal = new MemoryTerminal(20, 10);
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
test.each(["single", "rounded", "heavy", "double"] as const)(
  "%s panels share one edge with junctions and retain outer corners",
  async (border) => {
    const rects: ElementRef["rect"][] = [];
    await session(
      () =>
        row(
          ...["a", "b"].map((label) =>
            box(text(label))
              .border(border)
              .width(5)
              .height(3)
              .ref((ref) => {
                if (ref) rects.push(ref.rect);
              }),
          ),
        ).joinBorders(),
      async (terminal) => {
        expect(rects.map((rect) => rect.x)).toEqual([0, 4]);
        const rows = terminal.screen?.toString().split("\n");
        const expected =
          border === "double"
            ? ["╔═══╦═══╗", "║a  ║b  ║", "╚═══╩═══╝"]
            : border === "heavy"
              ? ["┏━━━┳━━━┓", "┃a  ┃b  ┃", "┗━━━┻━━━┛"]
              : border === "rounded"
                ? ["╭───┬───╮", "│a  │b  │", "╰───┴───╯"]
                : ["┌───┬───┐", "│a  │b  │", "└───┴───┘"];
        expect(rows?.slice(0, 3).map((line) => line.trimEnd())).toEqual(
          expected,
        );
      },
    );
  },
);
test("columns collapse horizontal borders, including intrinsic size", async () => {
  await session(
    () =>
      row(
        column(
          box(text("a")).border("single").width(5).height(3),
          box(text("b")).border("single").width(5).height(3),
        ).joinBorders(),
        text("after"),
      ),
    async (terminal) => {
      const rows = terminal.screen?.toString().split("\n");
      expect(rows?.[2]?.trimEnd()).toBe("├───┤");
      expect(rows?.[4]?.trimEnd()).toBe("└───┘");
      expect(rows?.[0]).toContain("┐after");
    },
  );
});
test("fill allocation consumes the full width without losing content to the shared border", async () => {
  const rects: ElementRef["rect"][] = [];
  await session(
    () =>
      row(
        ...["a", "b"].map((label) =>
          box(text(label))
            .border("single")
            .width("fill")
            .height(3)
            .ref((ref) => {
              if (ref) rects.push(ref.rect);
            }),
        ),
      ).joinBorders(),
    async (terminal) => {
      expect(rects.map((rect) => rect.width)).toEqual([11, 10]);
      expect(rects[1]?.x).toBe(10);
      expect(terminal.screen?.get(19, 0)?.text).toBe("┐");
    },
  );
});
test("gaps and disabled facing edges prevent overlap; absolute overlays stay on top", async () => {
  await session(
    () =>
      column(
        row(
          box().width(5).height(3).border("single"),
          box().width(5).height(3).border("single"),
        )
          .joinBorders()
          .gap(1),
        row(
          box().width(5).height(3).border("single").borderRight(false),
          box().width(5).height(3).border("single"),
        ).joinBorders(),
        row(
          box().width(5).height(3).border("single"),
          box().width(5).height(3).border("single"),
          text("X").position("absolute").left(4).top(0).zIndex(5),
        ).joinBorders(),
      ),
    async (terminal) => {
      expect(terminal.screen?.get(5, 0)?.text).toBe(" ");
      expect(terminal.screen?.get(5, 3)?.text).toBe("┌");
      expect(terminal.screen?.get(4, 6)?.text).toBe("X");
    },
  );
});
test("component panels join and retained frames update after toggling joining, color, and resize", async () => {
  const Panel = component(() => box(text("panel")).fill().border("rounded"));
  let change = (_value: boolean): void => {};
  await session(
    () => {
      const [joined, setJoined] = useState(true);
      change = setJoined;
      return row(
        Panel().fill(),
        box(text("other"))
          .fill()
          .border("rounded")
          .borderColor(joined ? "cyan" : "red"),
      ).joinBorders(joined);
    },
    async (terminal, app) => {
      expect(terminal.screen?.toString().split("\n")[0]).toContain("┬");
      change(false);
      await app.flush();
      expect(terminal.screen?.toString().split("\n")[0]).not.toContain("┬");
      change(true);
      terminal.resize(24, 8);
      await app.flush();
      const first = terminal.screen?.toString().split("\n")[0] ?? "";
      const x = first.indexOf("┬");
      expect(x).toBeGreaterThan(0);
      expect(terminal.screen?.get(x, 0)?.style.foreground).toBe("cyan");
      expect(terminal.screen?.get(23, 0)?.text).toBe("╮");
    },
  );
});

test("collapsed panels do not pull the next panel outside its parent", async () => {
  await session(
    () =>
      row(
        box().border("single").width("fill").maxWidth(0).height(3),
        box(text("visible")).border("single").width(9).height(3),
      ).joinBorders(),
    async (terminal) => {
      expect(terminal.screen?.get(0, 0)?.text).toBe("┌");
      expect(terminal.screen?.toString()).toContain("│visible│");
    },
  );
});
