import type { PixelBuffer } from "../index";

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
  useRef,
} from "../index";
import { waveform } from "./waveform";

const action = style().color("cyan").focused(style().background("#164e63"));
export function Canvas() {
  const [phase, setPhase] = useState(0);
  const [paused, setPaused] = useState(false);
  const app = useApp();
  const cached = useRef<{ phase: number; buffer: PixelBuffer } | undefined>(
    undefined,
  );
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(
      () => setPhase((previous) => previous + 0.0625),
      33,
    );
    return () => clearInterval(timer);
  }, [paused]);
  return column(
    text("Custom canvas · animated sine wave").bold(),
    canvas(
      (draw) => {
        const { pixelWidth: width, pixelHeight: height } = draw;
        if (!width || !height) return;
        const old = cached.current;
        if (
          !old ||
          old.phase !== phase ||
          old.buffer.width !== width ||
          old.buffer.height !== height
        )
          cached.current = { phase, buffer: waveform(width, height, phase) };
        if (cached.current) draw.pixels(cached.current.buffer);
      },
      { fit: "fill" },
    )
      .border("rounded")
      .borderColor("#475569")
      // .padding(1)
      .fill(),
    row(
      button(paused ? "Play" : "Pause", () => setPaused(!paused)).use(action),
      button("Reset", () => setPhase(0)).use(action),
      button("Quit", () => app.stop()).use(action),
    ).gap(2),
    text(
      "RGBA pixel waveform · Kitty → Sixel → quadrant blocks · resize to fit.",
    ).dim(),
  )
    .gap(1)
    .padding(1)
    .fill();
}

if (import.meta.main) await createApp(Canvas).run();
