import {
  box,
  button,
  column,
  createApp,
  overlay,
  row,
  style,
  text,
  useApp,
  useState,
} from "../index";

const panel = style().border("rounded").borderColor("#475569").padding([0, 2]);
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
    row(
      text("Completed").strikethrough(),
      text("Highlighted").inverse(),
    ).columnGap(2),
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

const opacitySamples = column(
  text("Layer opacity: 100%, 50%, nested 25%").bold(),
  overlay(
    box(text("Back layer: 100%").bold(), text("Text beneath the front layer"))
      .border("rounded")
      .borderColor("#93c5fd")
      .background("#1e3a8a")
      .color("#ffffff")
      .width(28)
      .height(4)
      .position("absolute"),
    box(text("Front group: 50%").bold(), text("Nested text: 25%").opacity(0.5))
      .border("rounded")
      .borderColor("#67e8f9")
      .background("#164e63")
      .color("#ffffff")
      .width(30)
      .height(4)
      .position("absolute")
      .left(18)
      .top(1)
      .zIndex(1)
      .opacity(0.5),
  )
    .width("fill")
    .height(5),
);

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
      button(connected ? "Disconnect" : "Connect", () =>
        setConnected(!connected),
      )
        .use(action)
        .color(connected ? "green" : "white"),
      button("Unavailable", { disabled: true, onPress: () => {} }).use(action),
      button("Quit", () => app.stop()).use(action),
    ).gap(2),
    opacitySamples,
    text(
      "Tab changes focus · Move the pointer to hover · Press and release to activate",
    ).dim(),
  )
    .gap(1)
    .padding(1)
    .width("fill");
}

if (import.meta.main) await createApp(Styles, { mode: "inline" }).run();
