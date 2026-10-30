import { column, text } from "../../index";
import { DeveloperTools, runDeveloperExample } from "./developer-tools";
import { useTicker } from "./use-ticker";

export function Console() {
  const count = useTicker(100, 40);
  return DeveloperTools({
    children: column(
      text("Live Data Feed with Console").background("red").padding([1, 2]),
      column(
        text(`Diddy: ${"#".repeat(count)}`),
        text(`Blud: ${"#".repeat(count * 4)}`).wrap("none"),
      )
        .background("#4acfff")
        .color("black")
        .padding([1, 2]),
      text("Open the console and type help, status, clear, or quit.").color(
        "yellow",
      ),
    )
      .gap(1)
      .height("fill"),
  });
}
if (import.meta.main) await runDeveloperExample(Console);
