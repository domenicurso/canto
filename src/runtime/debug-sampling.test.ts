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
test("diagnostic readings refresh atomically at four Hz and average completed frames", () => {
  const readings = new DebugSampling();
  const first = readings.read(frame(1, 10), 0);
  expect(first.frame).toBe(1);
  for (let i = 2; i <= 15; i++)
    expect(readings.read(frame(i, i), i * 16)).toBe(first);
  const next = readings.read(frame(16, 16), 256);
  expect(next.frame).toBe(16);
  expect(next.renderTime).toBe(9);
  expect(next.paintTime).toBe(9);
  expect(next.outputBytes).toBe(9000);
  expect(readings.read(frame(16, 16), 600)).toBe(next);
  const resumed = readings.read(frame(17, 20), 1000);
  expect(resumed.frame).toBe(17);
  expect(resumed.renderTime).toBe(20);
  expect(first.frame).toBe(1);
});
test("adapters without encoding metrics remain unknown in sampled readings", () => {
  const readings = new DebugSampling();
  const sample = frame(1, 10);
  delete sample.encodeTime;
  delete sample.writeTime;
  delete sample.outputBytes;
  expect(readings.read(sample, 0).encodeTime).toBeUndefined();
  readings.read(frame(2, 20), 100);
  const incomplete = { ...sample, frame: 3 };
  const next = readings.read(incomplete, 300);
  expect(next.encodeTime).toBeUndefined();
  expect(next.writeTime).toBeUndefined();
  expect(next.renderTime).toBe(15);
});
