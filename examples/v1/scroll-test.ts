import type { KeyEvent, ScrollPosition } from "../../index";

import { column, scroll, text, useState } from "../../index";
import { DeveloperTools, runDeveloperExample } from "./developer-tools";

const lines = Array.from(
  { length: 30 },
  (_, index) =>
    `Line ${String(index + 1).padStart(2, "0")}: This long line extends beyond the viewport to test horizontal scrolling. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`,
);
export function ScrollTest() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  return DeveloperTools({
    command: (value) => scrollCommand(offset, setOffset, value),
    children: column(
      text("Scroll Test Application").background("green").color("black").bold(),
      text(`Scroll: X=${offset.x}, Y=${offset.y}`),
      text(
        "Arrows / Shift+arrows · Page Up/Down · Home/End · Ctrl+Home/End",
      ).dim(),
      scroll(
        column(
          text("=== SCROLLABLE CONTENT TEST ===").background("blue"),
          ...lines.map((line, index) =>
            text(line)
              .wrap("none")
              .color(index % 2 ? "cyan" : "white"),
          ),
          text("=== END OF CONTENT ===").background("red"),
        ),
        { axis: "both", offset, onScroll: setOffset },
      )
        .height("fill")
        .width("fill")
        .autoFocus()
        .onKey((event) => {
          const next = navigateScroll(offset, event);
          if (next) {
            setOffset(next);
            event.preventDefault();
          }
        }),
    )
      .height("fill")
      .gap(1),
  });
}
if (import.meta.main) await runDeveloperExample(ScrollTest);

function navigateScroll(
  offset: ScrollPosition,
  event: KeyEvent,
): ScrollPosition | undefined {
  const step = event.shift ? 10 : 1;
  if (event.key === "left" || event.key === "right")
    return {
      ...offset,
      x: Math.max(0, offset.x + (event.key === "left" ? -step : step)),
    };
  if (event.key === "home" || event.key === "end") {
    const end = event.key === "end" ? 10000 : 0;
    return event.ctrl ? { ...offset, y: end } : { ...offset, x: end };
  }
  if (event.shift && (event.key === "up" || event.key === "down"))
    return {
      ...offset,
      y: Math.max(0, offset.y + (event.key === "up" ? -step : step)),
    };
}

function scrollCommand(
  offset: ScrollPosition,
  setOffset: (position: ScrollPosition) => void,
  value: string,
): string {
  if (value === "status") return `Scroll: X=${offset.x}, Y=${offset.y}`;
  const positions: Record<string, { x: number; y: number }> = {
    top: { ...offset, y: 0 },
    bottom: { ...offset, y: 10000 },
    center: { ...offset, y: 15 },
    reset: { x: 0, y: 0 },
  };
  const position = positions[value];
  if (!position) return `Unknown command: ${value}`;
  setOffset(position);
  return `Scroll requested: X=${position.x}, Y=${position.y}`;
}
