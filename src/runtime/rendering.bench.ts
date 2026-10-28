import {
  column,
  createApp,
  MemoryTerminal,
  row,
  text,
  useState,
} from "../../index";

let update = (_value: number): void => {};
const terminal = new MemoryTerminal(100, 30);
const app = createApp(
  () => {
    const [value, setValue] = useState(0);
    update = setValue;
    return row(
      column(text(value % 2 ? "a label\nwith another line" : "short label"))
        .width(40)
        .height("fill"),
      column(Array.from({ length: 300 }, (_, i) => text(`Stable row ${i}`)))
        .width(60)
        .height("fill"),
    ).fill();
  },
  { terminal },
);
const running = app.run();
try {
  await Bun.sleep(0);
  const initialNodes = app.stats.layoutNodes;
  const samples: number[] = [];
  for (let iteration = 1; iteration <= 120; iteration++) {
    const start = performance.now();
    update(iteration);
    await app.flush();
    if (iteration > 20) samples.push(performance.now() - start);
    terminal.frames.splice(0, terminal.frames.length - 1);
    terminal.output.splice(0, terminal.output.length - 1);
  }
  samples.sort((a, b) => a - b);
  console.log(
    JSON.stringify(
      {
        scenario: "geometry changes beside 300 unchanged rows",
        initialNodes,
        medianUpdateMs: samples[Math.floor(samples.length / 2)],
        p95UpdateMs: samples[Math.floor(samples.length * 0.95)],
        lastFrame: app.stats,
      },
      null,
      2,
    ),
  );
} finally {
  app.stop();
  await running;
}
