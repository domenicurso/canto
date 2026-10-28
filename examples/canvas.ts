import {
  button,
  canvas,
  column,
  createApp,
  row,
  style,
  text,
  useApp,
  useEffect,
  useState,
} from "../index";

import type { DrawingContext } from "../index";

const action = style().color("cyan").focused(style().background("#164e63"));
function waveform(draw: DrawingContext, phase: number): void {
  const center = Math.floor(draw.height / 2);
  draw.fill({ x: 0, y: 0, width: draw.width, height: draw.height }, { background: "#0f172a" });
  draw.write(0, center, "─".repeat(draw.width), { foreground: "#334155" });
  const amplitude = Math.max(0, Math.floor((draw.height - 2) / 2));
  for (let x = 0; x < draw.width; x++) {
    const y = center - Math.round(Math.sin(x / 6 + phase) * amplitude);
    draw.write(x, y, "●", { foreground: "cyan", bold: true });
  }
}
export function Canvas() {
  const [phase, setPhase] = useState(0);
  const [paused, setPaused] = useState(false);
  const app = useApp();
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => setPhase((previous) => previous + 0.15), 80);
    return () => clearInterval(timer);
  }, [paused]);
  return column(
    text("Custom canvas · animated sine wave").bold(),
    canvas((draw) => waveform(draw, phase))
      .border("rounded")
      .borderColor("#475569")
      .padding(1)
      .fill(),
    row(
      button(paused ? "Play" : "Pause", () => setPaused(!paused)).use(action),
      button("Reset", () => setPhase(0)).use(action),
      button("Quit", () => app.stop()).use(action),
    ).gap(2),
    text("Resize the terminal; drawing uses the canvas's current inner dimensions.").dim(),
  )
    .gap(1)
    .padding(1)
    .fill();
}

if (import.meta.main) await createApp(Canvas).run();
