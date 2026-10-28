import {
  button,
  column,
  createApp,
  row,
  style,
  text,
  useApp,
  useState,
} from "../index";

const panel = style().border("rounded").borderColor("#475569").padding([1, 2]);
const action = style()
  .padding([0, 2])
  .border("rounded")
  .borderColor("#475569")
  .hovered(style().borderColor("white"))
  .focused(style().borderColor("cyan").bold())
  .hovered(style().focused(style().background("#164e63")))
  .pressed(style().background("#164e63"))
  .disabled(style().color("gray").faint());
const warning = panel.borderColor("yellow");

const panelSamples = row(
  column(
    text("Original panel").bold(),
    text("Shared styles stay immutable.").dim(),
  )
    .use(panel)
    .width("fill"),
  column(
    text("Extended panel").color("yellow"),
    text("Only this panel has a yellow border."),
  )
    .use(warning)
    .width("fill"),
)
  .gap(2)
  .width("fill");

export function Styles() {
  const [connected, setConnected] = useState(false);
  const app = useApp();
  return column(
    text("Fluent styles and reusable treatments")
      .bold()
      .width("fill")
      .textAlign("center"),
    panelSamples,
    text(
      "Mix ",
      text("bold").bold(),
      ", ",
      text("italic").italic(),
      ", and ",
      text("underlined color")
        .underline("curly")
        .underlineColor("yellow")
        .color("cyan"),
      " in one paragraph.",
    ),
    row(
      text("Completed").strikethrough(),
      text("Highlighted").inverse(),
      text("Faded").opacity(0.5),
    ).columnGap(2),
    row(
      button(connected ? "Disconnect" : "Connect", () =>
        setConnected(!connected),
      )
        .use(action)
        .color(connected ? "green" : "white"),
      button("Unavailable", { disabled: true, onPress: () => {} }).use(action),
      button("Quit", () => app.stop()).use(action),
    ).gap(2),
    text(
      "Tab changes focus · Move the pointer to hover · Press and release to activate",
    ).dim(),
  )
    .gap(1)
    .padding(1)
    .width("fill");
}

if (import.meta.main) await createApp(Styles, { mode: "inline" }).run();
