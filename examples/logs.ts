import {
  button,
  column,
  createApp,
  row,
  scroll,
  style,
  text,
  useApp,
  useEffect,
  useRef,
  useState,
} from "../index";

const action = style().color("cyan").focused(style().background("#164e63"));
const messages = [
  "Accepted connection",
  "Fetched project metadata",
  "Rendered terminal frame",
  "Completed background job",
];

export function Logs() {
  const [lines, setLines] = useState<string[]>(["Waiting for simulated events…"]);
  const [paused, setPaused] = useState(false);
  const [following, setFollowing] = useState(true);
  const [offset, setOffset] = useState(0);
  const sequence = useRef(0);
  const app = useApp();
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      const id = sequence.current++;
      const entry = `${String(id + 1).padStart(4, "0")}  ${new Date().toLocaleTimeString()}  ${messages[id % messages.length]}`;
      setLines((previous) => [...previous.slice(-199), entry]);
    }, 350);
    return () => clearInterval(timer);
  }, [paused]);
  return column(
    row(
      text("Live event stream").bold().width("fill"),
      text(paused ? "PAUSED" : "LIVE").color(paused ? "yellow" : "green"),
    ),
    scroll(text(lines.join("\n")).wrap("none"), {
      axis: "vertical",
      offset: following ? Number.MAX_SAFE_INTEGER : offset,
      onScroll: (value) => {
        setOffset(value);
        setFollowing(false);
      },
      gutter: "stable",
    })
      .border("rounded")
      .borderColor("#475569")
      .padding([0, 1])
      .fill(),
    row(
      button(paused ? "Resume" : "Pause", () => setPaused(!paused)).use(action),
      button("Follow latest", () => setFollowing(true)).use(action),
      button("Clear", () => setLines([])).use(action),
      button("Quit", () => app.stop()).use(action),
    ).gap(2),
    text(
      following
        ? "Following new events · Scroll to browse history"
        : "Browsing history · Choose Follow latest to return",
    ).dim(),
  )
    .gap(1)
    .padding(1)
    .fill();
}

if (import.meta.main) await createApp(Logs).run();
