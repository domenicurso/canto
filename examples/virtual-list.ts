import {
  button,
  column,
  createApp,
  input,
  list,
  row,
  style,
  text,
  useApp,
  useMemo,
  useState,
} from "../index";

const projects = Array.from({ length: 10_000 }, (_, id) => ({
  id,
  name: `Project ${String(id + 1).padStart(5, "0")}`,
  language: ["TypeScript", "Rust", "Python"][id % 3] ?? "TypeScript",
}));
const action = style().color("cyan").focused(style().background("#164e63"));

export function VirtualList() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("No project selected");
  const app = useApp();
  const matches = useMemo(
    () => projects.filter((project) => project.name.toLowerCase().includes(query.toLowerCase())),
    [query],
  );
  return column(
    text("10,000 projects · virtualized rows").bold(),
    input({ value: query, onChange: setQuery, placeholder: "Filter by project number…" })
      .width("fill")
      .border("rounded")
      .padding([0, 1])
      .autoFocus(),
    list(matches, {
      height: 12,
      itemHeight: 1,
      key: (project) => project.id,
      render: (project) =>
        row(
          button(project.name, () => setSelected(`${project.name} · ${project.language}`))
            .use(action)
            .width("fill"),
          text(project.language).dim().width(12),
        )
          .gap(2)
          .width("fill"),
    }).key(query),
    text(`${matches.length.toLocaleString()} results · ${selected}`).color("green"),
    row(
      text("Tab to navigate · Page Down to scroll · Enter to select").dim().width("fill"),
      button("Quit", () => app.stop()).use(action),
    ).gap(1),
  )
    .padding(1)
    .gap(1)
    .fill();
}

if (import.meta.main) await createApp(VirtualList).run();
