import type { Element, KeyEvent, Mode } from "../index";

import {
  button,
  column,
  createApp,
  input,
  row,
  text,
  useApp,
  useEffect,
  useState,
} from "../index";
import { ProcessTerminal } from "../src/terminal/process";

const prompts = {
  unicode: "Unicode pipes align",
  colors: "Red, green, blue labels look correct",
  pointer: "Mouse activates the pointer button",
  keyboard: "Modified arrows match the key display",
  resize: "Shrink and expand without stale content",
  clipboard: "Copy and paste the exact sample",
} as const;
type Check = keyof typeof prompts;
type Verdict = "unverified" | "pass" | "fail";
export type TerminalChecks = Readonly<Record<Check, Verdict>>;
interface KeyboardEvidence {
  rawInput: string[];
  events: Array<Pick<KeyEvent, "key" | "ctrl" | "alt" | "shift" | "meta">>;
}

const initial: TerminalChecks = {
  unicode: "unverified",
  colors: "unverified",
  pointer: "unverified",
  keyboard: "unverified",
  resize: "unverified",
  clipboard: "unverified",
};

export function TerminalCheck(options: {
  onChange: (checks: TerminalChecks) => void;
  onKey?: (event: KeyEvent) => void;
}): Element {
  const app = useApp();
  const [checks, setChecks] = useState(initial);
  const [lastKey, setKey] = useState("Press modified arrows");
  const [copies, setCopies] = useState(0);
  useEffect(() => options.onChange(checks), [checks]);
  const verdict = (check: Check, value: Verdict): void =>
    setChecks((previous) => ({ ...previous, [check]: value }));
  return column(
    text("Canto terminal check — Tab/Enter or click to cycle each verdict"),
    text("Pass → fail → unverified. Ctrl+C ends and prints a report."),
    row(
      text("Red").color("red"),
      text("Green").color("green"),
      text("Blue").color("blue"),
    ).gap(2),
    text("ASCII |\n界界  |\n🙂🙂  |\nééééé |\n©❤    |"),
    text(lastKey),
    button(`Pointer activations: ${copies}`, () =>
      setCopies((value) => value + 1),
    ).onMouse((event) => {
      if (event.action === "release") verdict("pointer", "pass");
    }),
    button("Copy sample, then paste into the editor", () => {
      void app.clipboard
        .writeText("Canto clipboard check")
        .catch(() => verdict("clipboard", "fail"));
    }),
    input({
      placeholder: "Paste sample here",
      onChange: (value) => {
        if (value === "Canto clipboard check") verdict("clipboard", "pass");
      },
    }).width(35),
    ...verdictButtons(checks, verdict),
    text(
      "Alt+B/F can mean word movement. OS/terminal shortcuts may consume arrows.",
    ),
  ).onKey((event) => {
    options.onKey?.(event);
    if (event.key !== "tab")
      setKey(
        `${event.ctrl ? "Ctrl+" : ""}${event.alt ? "Alt+" : ""}${event.shift ? "Shift+" : ""}${event.meta ? "Meta+" : ""}${event.key}`,
      );
  });
}

function verdictButtons(
  checks: TerminalChecks,
  verdict: (check: Check, value: Verdict) => void,
): Element[] {
  return Object.entries(prompts).map(([name, prompt]) => {
    // Object.entries preserves these own keys from the closed prompt table.
    const check = name as Check;
    const next =
      checks[check] === "unverified"
        ? "pass"
        : checks[check] === "pass"
          ? "fail"
          : "unverified";
    return button(`[${checks[check]}] ${prompt}`, () => verdict(check, next));
  });
}

async function main(): Promise<void> {
  const argument = process.argv[2];
  if (
    argument !== undefined &&
    argument !== "inline" &&
    argument !== "fullscreen"
  )
    throw new Error("Usage: bun run terminal:check [inline|fullscreen]");
  const mode: Mode = argument ?? "fullscreen";
  const terminal = new ProcessTerminal();
  let checks = initial;
  const keyboard: KeyboardEvidence = { rawInput: [], events: [] };
  const capture = (bytes: Buffer): void => {
    keyboard.rawInput.push(bytes.subarray(0, 64).toString("hex"));
    keyboard.rawInput.splice(0, Math.max(0, keyboard.rawInput.length - 16));
  };
  const paused = process.stdin.readableFlowing !== true;
  process.stdin.on("data", capture);
  try {
    await createApp(
      () =>
        TerminalCheck({
          onChange: (value) => {
            checks = value;
          },
          onKey: ({ key, ctrl, alt, shift, meta }) => {
            keyboard.events.push({ key, ctrl, alt, shift, meta });
            keyboard.events.splice(0, Math.max(0, keyboard.events.length - 16));
          },
        }),
      { terminal, mode, debug: false },
    ).run();
  } finally {
    process.stdin.off("data", capture);
    if (paused) process.stdin.pause();
  }
  printReport(terminal, mode, checks, keyboard);
}

function printReport(
  terminal: ProcessTerminal,
  mode: Mode,
  checks: TerminalChecks,
  keyboard: KeyboardEvidence,
): void {
  console.log(
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        mode,
        bun: Bun.version,
        platform: process.platform,
        terminal: process.env.TERM_PROGRAM ?? "unknown",
        terminalVersion: process.env.TERM_PROGRAM_VERSION ?? "unknown",
        term: process.env.TERM ?? "unknown",
        tmux: Boolean(process.env.TMUX),
        cellSize: terminal.cellSize,
        graphics: terminal.graphics,
        checks,
        keyboard,
      },
      null,
      2,
    ),
  );
}

if (import.meta.main) await main();
