import { expect, test } from "bun:test";

import type { FrameStats } from "./frame-stats";

import { DebugSampling } from "./debug-sampling";

function frame(number: number, time: number): FrameStats {
  return {
    frame: number,
    fps: 60,
    updateTime: time,
    layoutTime: time,
    prepareTime: time,
    paintTime: time,
    diffTime: time,
    contentTime: time,
    layoutNodes: 0,
    paintedCells: 20,
    contentCellsWritten: 1,
    cellsWritten: 1,
    renderTime: time,
    debugTime: time,
    presentTime: time,
    intervalTime: time,
    encodeTime: time,
    writeTime: time,
    outputBytes: time * 1000,
  };
}
test("fast streams retain real activity and latency peaks without averaging counts", () => {
  const sampling = new DebugSampling();
  const first = sampling.read(frame(1, 10), frame(0, 10), 0);
  const activity = {
    ...frame(2, 5),
    contentCellsWritten: 36,
    paintedCells: 80,
    layoutNodes: 3,
  };
  const latency = frame(1, 100);
  expect(sampling.read(activity, latency, 16)).toBe(first);
  expect(sampling.read(frame(3, 12), frame(2, 4), 32)).toBe(first);
  const next = sampling.read(frame(4, 8), frame(3, 3), 250);
  expect(next.content).toBe(activity);
  expect(next.content.contentCellsWritten).toBe(36);
  expect(next.content.paintedCells).toBe(80);
  expect(next.content.layoutNodes).toBe(3);
  expect(next.completed).toBe(latency);
  expect(next.completed.outputBytes).toBe(100000);
  expect(first.content.frame).toBe(1);
});
test("native animation with no changed cells retains its slowest actual CPU frame", () => {
  const sampling = new DebugSampling();
  sampling.read(frame(1, 1), frame(0, 1), 0);
  const spike = { ...frame(2, 40), contentCellsWritten: 0 };
  sampling.read(spike, frame(1, 1), 16);
  const next = sampling.read(
    { ...frame(3, 3), contentCellsWritten: 0 },
    frame(2, 1),
    250,
  );
  expect(next.content).toBe(spike);
  expect(next.content.contentTime).toBe(40);
  expect(next.content.contentCellsWritten).toBe(0);
});
test.each([0, 1, 7])(
  "sparse %s FPS interactions publish exact current work even inside the readability window",
  (fps) => {
    const sampling = new DebugSampling();
    const content = { ...frame(1, 10), fps };
    sampling.read(content, frame(0, 1), 0);
    const hover = {
      ...content,
      frame: 2,
      contentCellsWritten: 36,
      paintedCells: 80,
    };
    const completed = frame(1, 10);
    const next = sampling.read(hover, completed, 10);
    expect(next.content).toBe(hover);
    expect(next.completed).toBe(completed);
    const click = { ...hover, frame: 3, contentCellsWritten: 12 };
    expect(sampling.read(click, frame(2, 5), 11).content).toBe(click);
    const idle = { ...click, frame: 4, contentCellsWritten: 0 };
    expect(sampling.read(idle, frame(3, 5), 12).content).toBe(idle);
  },
);
test("dropping to low FPS discards the held animation peak and unavailable adapter metrics stay unknown", () => {
  const sampling = new DebugSampling();
  sampling.read(frame(1, 10), frame(0, 10), 0);
  sampling.read(
    { ...frame(2, 80), contentCellsWritten: 100 },
    frame(1, 80),
    10,
  );
  const sparse = { ...frame(3, 1), fps: 1 };
  const completed = frame(2, 10);
  delete completed.encodeTime;
  delete completed.writeTime;
  delete completed.outputBytes;
  const next = sampling.read(sparse, completed, 20);
  expect(next.content).toBe(sparse);
  expect(next.completed).toBe(completed);
  expect(next.completed.encodeTime).toBeUndefined();
});
