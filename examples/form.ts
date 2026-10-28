import {
  button,
  column,
  createApp,
  input,
  row,
  style,
  text,
  textarea,
  useApp,
  useState,
} from "../index";

const field = style()
  .border("rounded")
  .borderColor("#475569")
  .padding([0, 1])
  .width("fill")
  .focused(style().borderColor("cyan"));
const action = style()
  .padding([0, 1])
  .focused(style().background("cyan").color("black"))
  .disabled(style().color("gray"));

export function Form() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const app = useApp();
  const valid =
    name.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return column(
    text("Create a contact").bold().color("cyan"),
    text("Name"),
    contactInput(name, setName, "Ada Lovelace", () =>
      setSaved(false),
    ).autoFocus(),
    text("Email"),
    contactInput(email, setEmail, "ada@example.com", () => setSaved(false)),
    text("Notes · Shift+arrows select · Enter adds a line").dim(),
    textarea({
      value: notes,
      onChange: setNotes,
      placeholder: "What are you working on?",
    })
      .use(field)
      .height(5),
    row(
      button("Save", { disabled: !valid, onPress: () => setSaved(true) }).use(
        action,
      ),
      button("Quit", () => app.stop()).use(action),
    ).gap(2),
    text(
      saved
        ? `Saved ${name} locally in this example.`
        : "Enter a name and a valid email to enable Save.",
    ).color(saved ? "green" : "gray"),
  )
    .gap(0)
    .padding([1, 2])
    .width("fill");
}

if (import.meta.main) await createApp(Form, { mode: "inline" }).run();

function contactInput(
  value: string,
  change: (value: string) => void,
  placeholder: string,
  invalidate: () => void,
) {
  return input({
    value,
    placeholder,
    onChange: (next) => {
      change(next);
      invalidate();
    },
  }).use(field);
}
