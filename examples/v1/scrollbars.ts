import { column, createApp, row, scroll, text, useState } from "../../index";

export function Scrollbars() {
  const [inertia, setInertia] = useState(false);
  const [bars, setBars] = useState(true);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  return column(
    text("Scrollable Widget with Scrollbars Demo").bold(),
    text(
      "Arrows: scroll both axes · Page Up/Down · wheel / Shift+wheel · Ctrl+C: exit",
    ).dim(),
    scroll(
      column(
        Array.from({ length: 40 }, (_, y) =>
          row(
            Array.from({ length: 20 }, (_, x) =>
              text(
                `Cell ${String(y + 1).padStart(2, "0")}-${String(x + 1).padStart(2, "0")}`,
              )
                .padding(1)
                .background((x + y) % 2 ? "green" : "blue")
                .color("black"),
            ),
          ),
        ),
      ),
      {
        axis: "both",
        offset,
        onScroll: setOffset,
        scrollbar: bars ? "visible" : "hidden",
        physics: inertia ? { friction: 8 } : "instant",
      },
    )
      .width(60)
      .height(15)
      .autoFocus(),
    text(
      `Scroll: X=${offset.x}, Y=${offset.y} · i: inertia ${inertia ? "on" : "off"} · b: bars ${bars ? "shown" : "hidden"}`,
    ).width("fill"),
  )
    .padding([1, 2])
    .gap(1)
    .onKey((event) => {
      if (event.key === "i") setInertia(!inertia);
      if (event.key === "b") setBars(!bars);
    });
}
if (import.meta.main) await createApp(Scrollbars).run();
