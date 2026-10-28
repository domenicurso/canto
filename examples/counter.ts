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

const panel = style().padding([1, 2]).border("rounded").borderColor("cyan");
const action = style().focused(style().background("cyan").color("black"));

function Counter() {
  const [count, setCount] = useState(0);
  const app = useApp();
  return column(
    text("Canto v2").bold(),
    text(`Count: ${count} · Doubled: ${count * 2}`),
    row(
      button("−", () => setCount((n) => n - 1)).use(action),
      button("+", () => setCount((n) => n + 1)).use(action),
      button("Quit", () => app.stop()).use(action),
    ).gap(3),
    text("Tab to navigate · Enter to activate · Ctrl+C to exit").dim(),
  )
    .use(panel)
    .gap(1);
}
await createApp(Counter, { mode: "inline" }).run();
