import { column, text } from "../../index";
import { DeveloperTools, runDeveloperExample } from "./developer-tools";
import { useTicker } from "./use-ticker";

export function Debug() {
  const counter = useTicker(100, 1000);
  return DeveloperTools({
    children: column(
      text("Debug Panel Tests").background("blue").padding([1, 2]).bold(),
      text(`Counter: ${counter}`).color("green"),
      text("F3 opens the current-frame debug inspector."),
      text(
        "The translucent inspector floats above the app without changing layout.",
      ).color("cyan"),
    )
      .gap(1)
      .height("fill"),
  });
}
if (import.meta.main) await runDeveloperExample(Debug);
