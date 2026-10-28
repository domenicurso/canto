import { expect, test } from "bun:test";

import type { PixelReport } from "./cell-size";
import type { TerminalEvent } from "./events";

import { CellMetrics, parsePixelReport } from "./cell-size";
import { Decoder } from "./decoder";

test("cell pixel reports take precedence over text-area estimates and reset on resize", () => {
  const metrics = new CellMetrics();
  expect(metrics.size(80, 24)).toEqual({ width: 8, height: 16 });
  metrics.report({ kind: "area", width: 800, height: 480 });
  expect(metrics.size(80, 24)).toEqual({ width: 10, height: 20 });
  metrics.report({ kind: "cell", width: 9, height: 21 });
  metrics.report({ kind: "area", width: 1600, height: 960 });
  expect(metrics.size(80, 24)).toMatchObject({ width: 9, height: 21 });
  metrics.invalidate();
  expect(metrics.size(80, 24)).toEqual({ width: 8, height: 16 });
});
test("pixel reports handle arbitrary chunking without becoming keyboard input", () => {
  const reports: PixelReport[] = [];
  const events: TerminalEvent[] = [];
  const decoder = new Decoder(
    (event) => events.push(event),
    undefined,
    (report) => reports.push(report),
  );
  for (const byte of Buffer.from("\x1b[6;21;9t\x1b[4;504;720t"))
    decoder.push(new Uint8Array([byte]));
  expect(reports).toEqual([
    { kind: "cell", width: 9, height: 21 },
    { kind: "area", width: 720, height: 504 },
  ]);
  expect(events).toHaveLength(0);
  expect(parsePixelReport("6;0;8t")).toBeUndefined();
  expect(parsePixelReport("6;16;-1t")).toBeUndefined();
  expect(parsePixelReport("8;24;80t")).toBeUndefined();
  expect(parsePixelReport(`6;16;${"9".repeat(400)}t`)).toBeUndefined();
});
