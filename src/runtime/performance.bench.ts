import {
  column,
  createApp,
  list,
  MemoryTerminal,
  text,
  useState,
} from "../../index";

const items = Array.from({ length: 10_000 }, (_, id) => ({ id }));
let update = (_value: number): void => {};
let rowsRendered = 0;
const terminal = new MemoryTerminal(100, 30);
const app = createApp(
  () => {
    const [count, setCount] = useState(0);
    update = setCount;
    return column(
      text(`Updates: ${count}`),
      list(items, {
        height: 25,
        itemHeight: 1,
        key: (item) => item.id,
        render: (item) => {
          rowsRendered++;
          return text(`Project ${item.id}`);
        },
      }),
    );
  },
  { terminal },
);
const start = performance.now();
const running = app.run();
const samples: number[] = [];
try {
  await app.flush();
  await Bun.sleep(0);
  const mountMs = performance.now() - start;
  const mountedRows = rowsRendered;
  for (let iteration = 1; iteration <= 120; iteration++) {
    const before = performance.now();
    update(iteration);
    await app.flush();
    if (iteration > 20) samples.push(performance.now() - before);
    terminal.frames.splice(0, terminal.frames.length - 1);
    terminal.output.splice(0, terminal.output.length - 1);
  }
  samples.sort((a, b) => a - b);
  console.log(
    JSON.stringify(
      {
        dataset: items.length,
        mountedRows,
        mountMs,
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
