import { column, createApp, input, row, text, useState } from "../../index";

export function Input() {
  const [name, setName] = useState("John Doe");
  const [email, setEmail] = useState("john@example.com");
  const [message, setMessage] = useState(
    "Hello, world! Type something long to test horizontal scrolling...",
  );
  return column(
    text("Input Widget Demo").color("green").bold(),
    text(
      "Tab: focus · Arrows: move · Ctrl+A: select all · Shift+arrows: select",
    ).dim(),
    row(
      text("Name:").width(10),
      input({ value: name, onChange: setName })
        .width(25)
        .background("green")
        .color("black")
        .autoFocus(),
    ).gap(1),
    row(
      text("Email:").width(10),
      input({ value: email, onChange: setEmail })
        .width(30)
        .background("yellow")
        .color("black"),
    ).gap(1),
    row(
      text("Message:").width(10),
      input({ value: message, onChange: setMessage })
        .width(40)
        .background("magenta"),
    ).gap(1),
    column(
      text(`Name: ${name}`),
      text(`Email: ${email}`),
      text(`Message: ${message}`),
    ),
    text("Ctrl+C to exit").dim(),
  ).gap(1);
}
if (import.meta.main) await createApp(Input, { mode: "inline" }).run();
