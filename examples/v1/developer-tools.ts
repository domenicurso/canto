import { column, component, createApp, input, scroll, text, useApp, useState } from "../../index";

import type { Child, ElementRef } from "../../index";

interface DeveloperToolsProps {
  children: Child;
  command?: (command: string) => string;
  inspect?: () => string;
}
export const DeveloperTools = component(({ children, command, inspect }: DeveloperToolsProps) => {
  const app = useApp();
  const [debug, setDebug] = useState(false);
  const [visible, setVisible] = useState(false);
  const [history, setHistory] = useState(["Type help for commands."]);
  const submit = (value: string): void => {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === "clear") {
      setHistory([]);
      return;
    }
    const reply =
      trimmed === "help"
        ? "help · clear · status · quit" + (command ? " · top · bottom · center · reset" : "")
        : trimmed === "status"
          ? (command?.(trimmed) ?? "App is running")
          : trimmed === "quit"
            ? "Stopping…"
            : (command?.(trimmed) ?? `Unknown command: ${trimmed}`);
    setHistory((lines) => [...lines, `> ${value}`, reply].slice(-100));
    if (trimmed === "quit") app.stop();
  };
  return column(
    children,
    text("F3: debug · F12 / Ctrl+T: console · Esc: close console · q: quit").dim(),
    debug &&
      text(inspect?.() ?? "No app statistics supplied")
        .border("single")
        .borderColor("cyan"),
    visible && consolePanel(history, submit),
  )
    .fill()
    .focusable()
    .autoFocus(!command)
    .onKey((event) => {
      if (event.key === "f3") setDebug(!debug);
      if (event.key === "f12" || (event.ctrl && event.key === "t")) setVisible(!visible);
      if (event.key === "escape") setVisible(false);
      if (!visible && event.key.toLowerCase() === "q") app.stop();
    });
});

function consolePanel(history: string[], submit: (value: string) => void) {
  return column(
    text("Console").bold(),
    scroll(column(history.map((line) => text(line))), { defaultOffset: 10000 })
      .key(`history:${history.join("\n")}`)
      .height(5)
      .tabIndex(-1),
    CommandInput({ submit }),
  )
    .border("rounded")
    .borderColor("cyan")
    .padding([0, 1]);
}
export async function runDeveloperExample(view: (inspect: () => string) => Child): Promise<void> {
  const app = createApp(() =>
    view(() => {
      const stats = app.stats;
      return `Previous frame: Render ${stats.renderTime.toFixed(2)}ms · Layout ${stats.layoutTime.toFixed(2)}ms · ${stats.cellsWritten} cells`;
    }),
  );
  await app.run();
}

function focusCommand(ref: ElementRef | null): void {
  ref?.focus();
}

const CommandInput = component(({ submit }: { submit: (value: string) => void }) => {
  const [value, setValue] = useState("");
  return input({
    value,
    onChange: setValue,
    placeholder: "help",
    onSubmit: (command) => {
      submit(command);
      setValue("");
    },
  })
    .ref(focusCommand)
    .width("fill");
});
