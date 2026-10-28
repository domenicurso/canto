import { column, createApp, input, row, text, useState } from "../../index";

export function Prompt() {
  const [value, setValue] = useState("");
  const [complete, setComplete] = useState(false);
  const error = value.length > 20 ? "Maximum length is 20" : "";
  return column(
    row(
      text("? What is your name:").color("cyan"),
      complete
        ? text(value).color("yellow")
        : input({
            value,
            onChange: setValue,
            placeholder: "John Doe",
            onSubmit: () => {
              if (!error) {
                setValue(value.trim() || "John Doe");
                setComplete(true);
              }
            },
          })
            .width(25)
            .color("yellow")
            .autoFocus(),
    ).gap(1),
    !complete && error && text(error).color("red"),
    text(
      complete
        ? "Answer accepted · Ctrl+C to exit"
        : "Enter to submit · Ctrl+C to exit",
    ).dim(),
  );
}
if (import.meta.main) await createApp(Prompt, { mode: "inline" }).run();
