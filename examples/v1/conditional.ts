import { column, createApp, row, text, useState } from "../../index";

export function Conditional() {
  const [message, setMessage] = useState(true);
  const [choices, setChoices] = useState(false);
  const [count, setCount] = useState(0);
  return column(
    text("Conditional Widget Demo").bold().color("green"),
    text("m: message · c: choices · Space: increment · r: reset · Ctrl+C: exit").dim(),
    text(`Counter: ${count}`).color("cyan"),
    message &&
      column(
        text("This message is conditionally rendered!").color("magenta"),
        text("It only appears when showMessage is true").dim(),
      ),
    choices &&
      column(
        text("Available Options:").color("blue"),
        ...["A", "B", "C"].map((option) => text(`  → Option ${option}`).color("yellow")),
      ),
    count >= 5 && text("Counter reached 5 or more!").color("green").bold(),
    count >= 10 && text("Counter reached 10 or more! Amazing!").color("red").bold(),
    row(
      text("Status:"),
      text("Message").color(message ? "green" : "red"),
      text("Choices").color(choices ? "green" : "red"),
    ).gap(1),
  )
    .gap(1)
    .focusable()
    .autoFocus()
    .onKey((event) => {
      if (event.key === "m") setMessage(!message);
      if (event.key === "c") setChoices(!choices);
      if (event.key === " ") setCount((value) => value + 1);
      if (event.key === "r") {
        setMessage(true);
        setChoices(false);
        setCount(0);
      }
    });
}
if (import.meta.main) await createApp(Conditional, { mode: "inline" }).run();
