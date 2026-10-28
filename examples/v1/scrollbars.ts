import { column, createApp, row, scroll, text, useState } from "../../index";

export function Scrollbars() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  return column(
    text("Scrollable Widget with Scrollbars Demo").bold(),
    text("Arrows: scroll both axes · Page Up/Down · mouse wheel · Ctrl+C: exit").dim(),
    scroll(
      column(
        Array.from({ length: 40 }, (_, y) =>
          row(
            Array.from({ length: 20 }, (_, x) =>
              text(`Cell ${String(y + 1).padStart(2, "0")}-${String(x + 1).padStart(2, "0")}`)
                .padding(1)
                .background((x + y) % 2 ? "green" : "blue")
                .color("black"),
            ),
          ),
        ),
      ),
      { axis: "both", offset, onScroll: setOffset, scrollbar: "visible" },
    )
      .width(60)
      .height(15)
      .autoFocus()
      .onKey((event) => {
        if (event.key !== "left" && event.key !== "right") return;
        setOffset({ ...offset, x: Math.max(0, offset.x + (event.key === "left" ? -1 : 1)) });
        event.preventDefault();
      }),
    text(`Scroll: X=${offset.x}, Y=${offset.y}`),
  )
    .padding([1, 2])
    .gap(1);
}
if (import.meta.main) await createApp(Scrollbars).run();
