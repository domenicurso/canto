import {
  box,
  button,
  column,
  createApp,
  overlay,
  row,
  scroll,
  style,
  text,
  useApp,
  useState,
} from "../index";

const panel = style().border("rounded").borderColor("#475569").padding(1);
const action = style().color("cyan").focused(style().background("#164e63"));

function Navigation() {
  return column(
    text("WORKSPACE").bold(),
    text("Overview").color("cyan"),
    text("Projects"),
    text("Activity"),
  )
    .gap(1)
    .use(panel)
    .width(20)
    .height("fill");
}
function Preview({ badge }: { badge: boolean }) {
  return overlay(
    column(
      text("A flexible content pane").bold(),
      text(
        "Resize the terminal. The sidebar stays at 20 columns, while these two panes share the remaining width in a 2:1 ratio. Text wraps before sibling heights are calculated.",
      ),
      box(text("Content → padding → border")).padding(1).border("double").color("cyan"),
    )
      .gap(1)
      .fill(),
    badge && text(" LIVE ").background("green").color("black").position("absolute").right(0).top(0),
  )
    .use(panel)
    .width("fill")
    .grow(2)
    .height("fill");
}
export function Layout() {
  const [badge, setBadge] = useState(true);
  const app = useApp();
  return column(
    row(
      text("Layout explorer").bold().width("fill"),
      button("Toggle badge", () => setBadge(!badge)).use(action),
      button("Quit", () => app.stop()).use(action),
    ).gap(2),
    row(
      Navigation(),
      Preview({ badge }),
      scroll(
        column(
          text("Inspector").bold(),
          ...Array.from({ length: 20 }, (_, index) => text(`Property ${index + 1}`)),
        ).gap(1),
      )
        .use(panel)
        .width("fill")
        .grow(1)
        .height("fill"),
    )
      .gap(1)
      .width("fill")
      .height("fill"),
    text("Tab to focus the inspector · ↑↓ / Page Up / Page Down to scroll").dim(),
  )
    .padding(1)
    .gap(1)
    .fill();
}

if (import.meta.main) await createApp(Layout).run();
