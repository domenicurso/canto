import { column, createApp, row, text } from "../../index";
import { useTicker } from "./use-ticker";

export function Hello() {
  const count = useTicker(100, 40);
  return column(
    text("Live Data Feed").background("red").padding([1, 2]),
    column(
      text(`Data Point A: ${"#".repeat(count)}`),
      text(`Data Point B: ${"#".repeat(Math.floor(count * 1.4))}`),
    )
      .background("#4acfff")
      .color("black")
      .padding([1, 2]),
    row(
      text("All data points update in real time,"),
      text("reflecting simulated metrics.").bold(),
    )
      .gap(1)
      .style({ italic: true }),
    text("Ctrl+C to exit").dim(),
  ).gap(1);
}
if (import.meta.main) await createApp(Hello, { mode: "inline" }).run();
