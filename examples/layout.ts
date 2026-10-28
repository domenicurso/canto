import {
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
  useViewport,
} from "../index";

const action = style().color("cyan").focused(style().background("#164e63"));

function panel(compact: boolean) {
  return style()
    .border("rounded")
    .borderColor("#475569")
    .padding(compact ? [0, 1] : 1);
}

function Navigation(compact: boolean) {
  return scroll(
    column(
      text("WORKSPACE").bold(),
      text("Overview").color("cyan"),
      text("Projects"),
      text("Activity"),
    ).gap(compact ? 0 : 1),
  )
    .use(panel(compact))
    .width(20)
    .height("fill");
}

function Preview({ badge, compact }: { badge: boolean; compact: boolean }) {
  return overlay(
    scroll(
      column(
        text("A flexible content pane").bold(),
        text(
          "Resize the terminal. Wide views share space in a 2:1 ratio; smaller views stack the panes. Each pane scrolls instead of crushing its labels.",
        ),
        text("Content → padding → border")
          .padding([0, 1])
          .border("double")
          .color("cyan"),
      ).gap(1),
    ).fill(),
    badge &&
      text(" LIVE ")
        .background("green")
        .color("black")
        .position("absolute")
        .right(0)
        .top(0),
  )
    .use(panel(compact))
    .width("fill")
    .grow(2)
    .height("fill");
}

function Inspector(compact: boolean) {
  return scroll(
    column(
      text("Inspector").bold(),
      Array.from({ length: 20 }, (_, index) => text(`Property ${index + 1}`)),
    ).gap(compact ? 0 : 1),
  )
    .use(panel(compact))
    .width("fill")
    .grow(1)
    .height("fill");
}

export function Layout() {
  const [badge, setBadge] = useState(true);
  const app = useApp();
  const { width, height } = useViewport();

  const compact = height < 18;
  const stacked = width < 80 || height < 10;

  const body = stacked
    ? scroll(
        column(
          text("WORKSPACE · Overview · Projects · Activity").color("cyan"),
          Preview({ badge, compact }).height(9),
          Inspector(compact).height(7),
        ).gap(1),
      )
        .fill()
        .key("stacked")
    : row(Navigation(compact), Preview({ badge, compact }), Inspector(compact))
        .gap(1)
        .fill()
        .key("panes");

  return column(
    row(
      text("Layout explorer").bold().width("fill"),
      button(width < 50 ? "Badge" : "Toggle badge", () => setBadge(!badge)).use(
        action,
      ),
      button("Quit", () => app.stop()).use(action),
    ).gap(1),
    body,
    height >= 8 &&
      text(
        width < 60
          ? "Tab: focus · ↑↓ / PgUp/PgDn: scroll"
          : "Tab: focus pane · arrows / Page Up/Down: scroll",
      )
        .dim()
        .wrap("none")
        .overflow("ellipsis"),
  )
    .padding(compact ? 0 : 1)
    .gap(compact ? 0 : 1)
    .fill();
}

if (import.meta.main) await createApp(Layout).run();
