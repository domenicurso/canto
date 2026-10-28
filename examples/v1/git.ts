import type { GitFile } from "./git-status";

import {
  column,
  createApp,
  row,
  scroll,
  text,
  useApp,
  useEffect,
  useState,
} from "../../index";
import { readGitStatus } from "./git-status";

type Status =
  | { kind: "loading" }
  | { kind: "ready"; files: GitFile[] }
  | { kind: "error"; message: string };
export function Git() {
  const app = useApp();
  const [revision, setRevision] = useState(0);
  const status = useGitStatus(revision);
  const [selected, setSelected] = useState(0);
  const files = status.kind === "ready" ? status.files : [];
  return column(
    text("Git Status").bold().color("cyan"),
    text(
      status.kind === "loading"
        ? "Loading…"
        : status.kind === "error"
          ? status.message
          : files.length
            ? `${files.length} files:`
            : "No changes",
    ).color("yellow"),
    fileTable(files, selected),
    text("q: quit · r: refresh · ↑↓: navigate · read-only Git status").dim(),
  )
    .fill()
    .gap(1)
    .background("#222")
    .focusable()
    .autoFocus()
    .onKey((event) => {
      if (event.key === "q") app.stop();
      if (event.key === "r") {
        setSelected(0);
        setRevision((value) => value + 1);
      }
      if (event.key === "up") setSelected(Math.max(0, selected - 1));
      if (event.key === "down")
        setSelected(Math.min(Math.max(0, files.length - 1), selected + 1));
    });
}
if (import.meta.main) await createApp(Git).run();

function useGitStatus(revision: number): Status {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  useEffect(() => {
    const controller = new AbortController();
    setStatus({ kind: "loading" });
    void readGitStatus(controller.signal)
      .then((files) => {
        if (!controller.signal.aborted) {
          setStatus({ kind: "ready", files });
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setStatus({
            kind: "error",
            message: error instanceof Error ? error.message : String(error),
          });
      });
    return () => controller.abort();
  }, [revision]);
  return status;
}

function fileTable(files: GitFile[], selected: number) {
  return scroll(
    column(
      files.map((file, index) =>
        row(text(file.path).width("fill"), text(file.status).color(file.color))
          .gap(2)
          .padding([0, 1])
          .background(selected === index ? "#444" : "#222")
          .style({ bold: selected === index })
          .key(file.path),
      ),
    ),
    {
      axis: "vertical",
      offset: Math.max(0, selected - 10),
      onScroll: () => {},
    },
  )
    .height("fill")
    .width("fill")
    .tabIndex(-1);
}
