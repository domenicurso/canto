import { appendFileSync } from "node:fs";

import {
  button,
  column,
  component,
  createApp,
  keyEvent,
  MemoryTerminal,
  text,
  useEffect,
  useMemo,
  useState,
} from "../../../../index";

const label = "version-one";
const report =
  process.argv[2] ??
  (() => {
    throw new Error("A hot-session report path is required.");
  })();
const key = Symbol.for("canto.hot-test-terminal");
const globals = globalThis as typeof globalThis & { [key]?: MemoryTerminal };
const terminal = (globals[key] ??= new MemoryTerminal(80, 24));

const Counter = component(
  function Counter() {
    const [count, setCount] = useState(0);
    return button(`child=${count}`, () => setCount(count + 1)).autoFocus();
  },
  { hot: `${import.meta.url}#Counter` },
);

function Root() {
  const [count, setCount] = useState(0);
  const title = useMemo(() => label, []);
  useEffect(() => {
    appendFileSync(report, `start ${label}\n`);
    const data = (chunk: Buffer): void => {
      const key = chunk.toString().trim();
      if (key === "quit") app.stop();
      else terminal.dispatch({ type: "key", event: keyEvent(key) });
      void app
        .flush()
        .then(() => {
          appendFileSync(report, `${terminal.screen?.toString()}\n`);
        })
        .catch((error: unknown) => {
          throw error;
        });
    };
    process.stdin.on("data", data);
    process.stdin.resume();
    return () => {
      process.stdin.off("data", data);
      appendFileSync(report, `stop ${label}\n`);
    };
  }, []);
  useEffect(() => {
    appendFileSync(report, `${terminal.screen?.toString()}\n`);
  });
  return column(text(`${title} root=${count}`), Counter()).onKey((event) => {
    if (event.key === "r") setCount(count + 1);
  });
}

const app = createApp(Root, { terminal, hot: import.meta.url });
// Bun starts watching once entry-point evaluation completes; don't await the session here.
void app
  .run()
  .then(() => process.stdin.pause())
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
