import {
  button,
  column,
  component,
  createApp,
  input,
  row,
  scroll,
  style,
  text,
  useApp,
  useEffect,
  useState,
} from "../index";

const panel = style().border("rounded").borderColor("#334155").padding([0, 1]);
const action = style().color("cyan").focused(style().background("#164e63").bold());
const Project = component(({ name }: { name: string }) => {
  const [stars, setStars] = useState(0);
  return row(
    text(name).width("fill"),
    button(`★ ${stars}`, () => setStars((n) => n + 1)).use(action),
  ).gap(1);
});
const projects = Array.from({ length: 100 }, (_, index) => `Project ${index + 1}`);
function Dashboard() {
  const [query, setQuery] = useState("");
  const [time, setTime] = useState(() => new Date());
  const app = useApp();
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return column(
    row(text("CANTO").bold().width("fill"), text(time.toLocaleTimeString()).dim()).padding([0, 2]),
    input({ value: query, onChange: setQuery, placeholder: "Find a project…" })
      .use(panel)
      .width("fill")
      .autoFocus(),
    scroll(
      column(
        ...projects
          .filter((name) => name.toLowerCase().includes(query.toLowerCase()))
          .map((name) => Project({ name }).key(name)),
      ).width("fill"),
    )
      .use(panel)
      .width("fill")
      .height("fill"),
    row(
      text("Tab to navigate · ↑↓ to scroll").dim().width("fill"),
      button("Quit", () => app.stop()).use(action),
    ).padding([0, 2]),
  )
    .padding([0, 1])
    .fill()
    .align("stretch");
}
await createApp(Dashboard).run();
