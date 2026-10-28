import { column, createApp, scroll, text, useState } from "../../index";

const choices = [
  "Red",
  "Green",
  "Blue",
  "Yellow",
  "Purple",
  "Orange",
  "Pink",
  "Black",
];

export function Choice() {
  const [current, setCurrent] = useState(0);
  const [complete, setComplete] = useState(false);

  return column(
    text(
      `? What is your favorite color: ${complete ? choices[current] : ""}`,
    ).color("cyan"),
    !complete && text("↑/↓ to navigate · Enter to select").dim(),
    !complete &&
      scroll(
        column(
          choices.map((choice, index) =>
            text(`${current === index ? "→" : " "} ${choice}`)
              .style({ faint: current !== index, underline: current === index })
              .color("yellow"),
          ),
        ),
        {
          axis: "vertical",
          offset: Math.max(0, current - 3),
          onScroll: () => {},
          scrollbar: "hidden",
        },
      )
        .width(20)
        .height(4)
        .tabIndex(-1),
    text("Ctrl+C to exit").dim(),
  )
    .focusable()
    .autoFocus()
    .onKey((event) => {
      if (complete) return;
      if (event.key === "up")
        setCurrent((current + choices.length - 1) % choices.length);
      if (event.key === "down") setCurrent((current + 1) % choices.length);
      if (event.key === "enter") setComplete(true);
    });
}

if (import.meta.main) await createApp(Choice, { mode: "inline" }).run();
