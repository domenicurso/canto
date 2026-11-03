import {
  column,
  createApp,
  MemoryTerminal,
  text,
  useState,
} from "../../../index";

const terminal = new MemoryTerminal(120, 40);
const children = Array.from({ length: 1000 }, (_, index) =>
  text(`Row ${index}`).key(index),
);
let advance = (_frame: number): void => {};
const app = createApp(
  () => {
    const [frame, setFrame] = useState(0);
    advance = setFrame;
    return column(text(`Frame ${frame}`), children).fill();
  },
  { terminal },
);
const running = app.run();
try {
  await Bun.sleep(0);
  for (const mode of ["hidden", "elements"]) {
    if (mode === "elements") {
      app.debug.setPicking(true);
      await app.flush();
      app.debug.setPicking(false);
      await app.flush();
    }
    const samples = await measure();
    samples.sort((a, b) => a - b);
    console.log(
      JSON.stringify({
        mode,
        rows: children.length,
        medianDebugMs: samples[Math.floor(samples.length / 2)],
        p95DebugMs: samples[Math.floor(samples.length * 0.95)],
      }),
    );
  }
} finally {
  app.stop();
  await running;
}

async function measure(): Promise<number[]> {
  const samples: number[] = [];
  for (let frame = 0; frame < 85; frame++) {
    advance(frame + 1);
    await app.flush();
    if (frame >= 5) samples.push(app.stats.debugTime);
    terminal.frames.splice(0, terminal.frames.length - 1);
    terminal.output.length = 0;
  }
  return samples;
}
