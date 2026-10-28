import { column, createApp, text } from "../../index";
import { useTicker } from "./use-ticker";

export function AbsolutePosition() {
  const offset = useTicker(400, 16);
  return column(
    text("Absolute positioning demo").bold(),
    text("Absolute children share a stacking context with static nodes."),
    column(
      text("Static content A").background("#224").padding([0, 1]),
      text("Static content B").background("#446").padding([0, 1]),
      text(`Badge offset: ${offset}`)
        .position("absolute")
        .top(0)
        .right(0)
        .background("yellow")
        .color("black")
        .zIndex(2),
      text("Pinned to bottom-left")
        .position("absolute")
        .bottom(-1)
        .left(-2)
        .background("blue")
        .zIndex(1),
      text("Sliding badge")
        .position("absolute")
        .top(4)
        .left(2 + offset)
        .background("magenta")
        .zIndex(3),
    )
      .width(40)
      .height(12)
      .padding([1, 2])
      .gap(1)
      .background("#111")
      .overflow("visible"),
    text("Ctrl+C to exit").dim(),
  )
    .gap(1)
    .padding([1, 2]);
}
if (import.meta.main) await createApp(AbsolutePosition).run();
