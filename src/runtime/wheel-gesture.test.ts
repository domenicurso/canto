import { expect, test } from "bun:test";

import type { ScrollPosition, ScrollProps } from "../../index";

import {
  createApp,
  keyEvent,
  MemoryTerminal,
  scroll,
  text,
  useState,
} from "../../index";
import { Decoder } from "../terminal/decoder";
import { decayMotion } from "./scroll-physics";

const content = Array.from({ length: 100 }, () => "0123456789".repeat(10)).join(
  "\n",
);
async function gesture(
  physics: ScrollProps["physics"],
  check: (context: {
    terminal: MemoryTerminal;
    send: (codes: number[]) => void;
    flush: () => Promise<void>;
    position: () => ScrollPosition;
  }) => Promise<void>,
): Promise<void> {
  const terminal = new MemoryTerminal(8, 3);
  let position: ScrollPosition = { x: 0, y: 0 };
  const app = createApp(
    () => {
      const [offset, setOffset] = useState(position);
      position = offset;
      return scroll(text(content), {
        axis: "both",
        offset,
        onScroll: setOffset,
        physics,
        scrollbar: "hidden",
      }).fill();
    },
    { terminal },
  );
  const decoder = new Decoder((event) => terminal.dispatch(event));
  const running = app.run();
  try {
    await Bun.sleep(0);
    await check({
      terminal,
      send: (codes) =>
        decoder.push(
          Buffer.from(codes.map((code) => `\x1b[<${code};2;2M`).join("")),
        ),
      flush: () => app.flush(),
      position: () => position,
    });
  } finally {
    app.stop();
    await running;
  }
}
test("native diagonal reports are not aspect-scaled twice and leave no input queue", async () => {
  await gesture(undefined, async ({ terminal, send, flush, position }) => {
    const frames = terminal.frames.length;
    send(Array.from({ length: 10 }, () => [65, 67]).flat());
    await flush();
    expect(position()).toEqual({ x: 10, y: 10 });
    expect(terminal.frames.length).toBe(frames + 1);
    const settled = terminal.frames.length;
    await Bun.sleep(40);
    expect(terminal.frames.length).toBe(settled);
  });
});
test("wheel distances use cell aspect and preserve fractional columns across frames", async () => {
  await gesture(undefined, async ({ terminal, send, flush, position }) => {
    terminal.cellSize = { width: 8, height: 15 };
    const pixels = (x: number, y: number): void =>
      terminal.dispatch({
        type: "mouse",
        event: {
          action: "scroll",
          button: 0,
          x: 1,
          y: 1,
          deltaX: x,
          deltaY: y,
          deltaMode: "pixel",
        },
      });
    pixels(30, 15);
    await flush();
    expect(position()).toEqual({ x: 3, y: 1 });
    pixels(15, 0);
    await flush();
    expect(position()).toEqual({ x: 5, y: 1 });
    terminal.cellSize = { width: 10, height: 10 };
    pixels(10, 10);
    await flush();
    expect(position()).toEqual({ x: 6, y: 2 });
    send([65, 67]);
    await flush();
    expect(position()).toEqual({ x: 7, y: 3 });
  });
});
test("opt-in physics continues motion, settles, and cancels all timers on shutdown", async () => {
  let terminal: MemoryTerminal | undefined;
  await gesture({ friction: 60 }, async (context) => {
    terminal = context.terminal;
    context.send([65, 67]);
    await context.flush();
    const start = context.position();
    await Bun.sleep(80);
    await context.flush();
    expect(context.position().x).toBeGreaterThan(start.x);
    expect(context.position().y).toBeGreaterThan(start.y);
    await Bun.sleep(180);
    const frames = context.terminal.frames.length;
    await Bun.sleep(60);
    expect(context.terminal.frames.length).toBe(frames);
  });
  const frames = terminal?.frames.length;
  await Bun.sleep(30);
  expect(terminal?.frames.length).toBe(frames);
  expect(terminal?.stopped).toBe(true);
});
test("physics decay is independent of frame subdivision and invalid settings are rejected", () => {
  const whole = decayMotion({ x: 10, y: 20 }, 1, 8);
  const first = decayMotion({ x: 10, y: 20 }, 0.4, 8);
  const second = decayMotion(first.velocity, 0.6, 8);
  expect(first.delta.x + second.delta.x).toBeCloseTo(whole.delta.x, 10);
  expect(first.delta.y + second.delta.y).toBeCloseTo(whole.delta.y, 10);
  expect(second.velocity.x).toBeCloseTo(whole.velocity.x, 10);
  expect(() => scroll(text("x"), { physics: { friction: 0 } })).toThrow(
    "friction",
  );
  expect(() => scroll(text("x"), { physics: { momentum: -1 } })).toThrow(
    "momentum",
  );
});

test("shutdown cancels physics while motion is still active", async () => {
  let output: MemoryTerminal | undefined;
  await gesture({ friction: 1 }, async ({ terminal, send, flush }) => {
    output = terminal;
    send([65, 67]);
    await flush();
  });
  const frames = output?.frames.length;
  await Bun.sleep(50);
  expect(output?.frames.length).toBe(frames);
  expect(output?.stopped).toBe(true);
});

test("keyboard scrolling cancels existing wheel momentum", async () => {
  await gesture(
    { friction: 1, momentum: 40 },
    async ({ terminal, send, flush, position }) => {
      send([65]);
      await flush();
      terminal.dispatch({ type: "key", event: keyEvent("tab") });
      await flush();
      terminal.dispatch({ type: "key", event: keyEvent("down") });
      await flush();
      const stopped = position();
      await Bun.sleep(80);
      await flush();
      expect(position()).toEqual(stopped);
    },
  );
});

test("a pointer press cancels queued wheel input without disabling subsequent wheel scheduling", async () => {
  await gesture(undefined, async ({ terminal, send, flush, position }) => {
    send([65]);
    terminal.dispatch({
      type: "mouse",
      event: {
        action: "press",
        button: 0,
        deltaY: 0,
        x: 1,
        y: 1,
      },
    });
    await flush();
    expect(position()).toEqual({ x: 0, y: 0 });
    send([65]);
    await Bun.sleep(20);
    expect(position()).toEqual({ x: 0, y: 1 });
  });
});
