import type { Element, KeyEvent } from "../index";
import type { Generation } from "./ai-line";

import {
  createApp,
  input,
  row,
  text,
  useEffect,
  useState,
  useViewport,
} from "../index";
import {
  generationLine,
  revealAt,
  shimmerDuration,
  startGeneration,
} from "./ai-line";

interface AIProps {
  generate?: (prompt: string) => Promise<string>;
}

type PromptState =
  | { phase: "editing"; value: string }
  | { phase: "generating"; generation: Generation };

// This example simulates an AI response; it never executes the command.
async function demoCommand(): Promise<string> {
  await Bun.sleep(4000);
  return "find . -type f -mtime -1";
}

export function GenerateText({
  generate = demoCommand,
}: AIProps = {}): Element {
  const [state, setState] = useState<PromptState>({
    phase: "editing",
    value: "Find files modified in the last 24 hours",
  });
  const draft =
    state.phase === "editing" ? state.value : state.generation.prompt;
  const [now, setNow] = useState(0);
  const viewport = useViewport();
  useGeneration(state, setState, generate);
  useAnimation(state, setState, setNow);
  const onKey = (event: KeyEvent): void => {
    if (
      event.key !== "enter" ||
      !event.alt ||
      state.phase !== "editing" ||
      !draft.trim()
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    const generation = startGeneration(draft, performance.now());
    setNow(generation.startedAt);
    setState({ phase: "generating", generation });
  };
  const animated =
    state.phase === "generating"
      ? generationLine(state.generation, now, Math.max(0, viewport.width - 2))
      : text("");
  const content = promptContent(
    state,
    {
      value: draft,
      onChange: (value) => setState({ phase: "editing", value }),
    },
    onKey,
    animated,
  );
  return row(text("$ ").faint(), content)
    .height(1)
    .width("fill")
    .overflow("clip")
    .focusable(state.phase !== "editing")
    .autoFocus(state.phase !== "editing")
    .onKey(onKey);
}

type SetPrompt = (
  value: PromptState | ((previous: PromptState) => PromptState),
) => void;

function useGeneration(
  state: PromptState,
  setState: SetPrompt,
  generate: (prompt: string) => Promise<string>,
): void {
  const request = state.phase === "generating" ? state.generation : undefined;
  useEffect(() => {
    if (request === undefined) return;
    let active = true;
    const settle = (value: string): void => {
      if (!active) return;
      const response = {
        text: value.replace(/[\r\n\t]+/g, " "),
        readyAt: performance.now(),
      };
      setState((previous) =>
        previous.phase === "generating"
          ? { ...previous, generation: { ...previous.generation, response } }
          : previous,
      );
    };
    void Promise.resolve()
      .then(() => generate(request.prompt))
      .then(settle, (error: unknown) => {
        settle(
          `Generation failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    return () => {
      active = false;
    };
  }, [request?.startedAt, generate]);
}

function promptContent(
  state: PromptState,
  field: { value: string; onChange: (value: string) => void },
  onKey: (event: KeyEvent) => void,
  animated: Element,
): Element {
  return state.phase === "editing"
    ? input({
        ...field,
        placeholder: "Describe a command · Alt+Enter",
      })
        .autoFocus()
        .width("fill")
        .onKey(onKey)
    : animated;
}

function useAnimation(
  state: PromptState,
  setState: SetPrompt,
  setNow: (value: number) => void,
): void {
  const running = state.phase === "generating";
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      const now = performance.now();
      setNow(now);
      setState((previous) => {
        if (previous.phase !== "generating") return previous;
        const { generation } = previous;
        return generation.response &&
          now >= revealAt(generation) + shimmerDuration
          ? { phase: "editing", value: generation.response.text }
          : previous;
      });
    }, 16);
    return () => clearInterval(timer);
  }, [running]);
}

if (import.meta.main) {
  await createApp(GenerateText, { mode: "inline" }).run();
}
