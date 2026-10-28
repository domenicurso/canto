import { column, text } from "../../index";
import { DeveloperTools, runDeveloperExample } from "./developer-tools";
import { useTicker } from "./use-ticker";

export function Debug(inspect?: () => string) {
  const counter = useTicker(100, 1000);
  return DeveloperTools({
    inspect,
    children: column(
      text("Debug Panel Tests").background("blue").padding([1, 2]).bold(),
      text(`Counter: ${counter}`).color("green"),
      text("F3 shows the last committed frame's actual rendering statistics."),
      text(
        "Console and debug panels are composed from ordinary v2 elements.",
      ).color("cyan"),
    )
      .gap(1)
      .height("fill"),
  });
}
if (import.meta.main) await runDeveloperExample(Debug);
