import type { App, FrameStats } from "../../index";

import { waveform } from "../../examples/waveform";
import { canvas, createApp, MemoryTerminal, useState } from "../../index";
import { GraphicsOutput } from "../terminal/graphics-output";

async function benchmark(cellSize: {
  width: number;
  height: number;
}): Promise<void> {
  const terminal = new MemoryTerminal(175, 44);
  terminal.cellSize = cellSize;
  terminal.graphics.kitty = true;
  let update = (_value: number): void => {};
  const app = createApp(
    () => {
      const [phase, setPhase] = useState(0);
      update = setPhase;
      return canvas(
        (draw) =>
          draw.pixels(waveform(draw.pixelWidth, draw.pixelHeight, phase)),
        { fit: "fill" },
      ).fill();
    },
    { terminal },
  );
  const running = app.run();
  try {
    await Bun.sleep(0);
    for (const inspector of [false, true]) {
      app.debug.setVisible(inspector);
      const samples = await collect(app, terminal, update);
      report(samples, { cellSize, inspector });
    }
  } finally {
    app.stop();
    await running;
  }
}
interface Sample {
  stats: Readonly<FrameStats>;
  encode: number;
  bytes: number;
}
async function collect(
  app: App,
  terminal: MemoryTerminal,
  update: (value: number) => void,
): Promise<Sample[]> {
  const graphics = new GraphicsOutput();
  const samples: Sample[] = [];
  for (let iteration = 0; iteration < 40; iteration++) {
    update(iteration * 0.0625);
    await app.flush();
    const start = performance.now();
    const output = graphics.update(terminal.screen?.rasters ?? []).output;
    if (iteration >= 10)
      samples.push({
        stats: app.stats,
        encode: performance.now() - start,
        bytes: Buffer.byteLength(output),
      });
    terminal.frames.splice(0, terminal.frames.length - 1);
    terminal.output.splice(0, terminal.output.length - 1);
  }
  return samples;
}
function report(
  samples: Sample[],
  scenario: { cellSize: { width: number; height: number }; inspector: boolean },
): void {
  const totals = samples
    .map((sample) => sample.stats.renderTime + sample.encode)
    .sort((a, b) => a - b);
  const average = (value: (sample: Sample) => number): number =>
    samples.reduce((sum, sample) => sum + value(sample), 0) / samples.length;
  console.log(
    JSON.stringify({
      scenario:
        "175x44 native waveform; excludes stream write and terminal display",
      ...scenario,
      medianMs: totals[Math.floor(totals.length / 2)],
      p95Ms: totals[Math.floor(totals.length * 0.95)],
      paintMs: average((sample) => sample.stats.paintTime),
      inspectorMs: average((sample) => sample.stats.debugTime),
      encodeMs: average((sample) => sample.encode),
      outputKiB: average((sample) => sample.bytes / 1024),
    }),
  );
}
await benchmark({ width: 11, height: 26 });
await benchmark({ width: 22, height: 52 });
