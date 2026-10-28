import {
  column,
  createApp,
  input,
  scroll,
  text,
  useApp,
  useState,
} from "../../../index";

let trackingFailure: { cause: unknown } | undefined;

function Interactive() {
  const app = useApp();
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  return column(
    text("Select 界 text").selectable(),
    scroll(
      text(
        Array.from(
          { length: 40 },
          (_, i) =>
            `ROW ${String(i).padStart(2, "0")} ` + "0123456789".repeat(5),
        ).join("\n"),
      ),
      {
        axis: "both",
        offset,
        onScroll: setOffset,
      },
    )
      .width(20)
      .height(6)
      .autoFocus(),
    text(`offset=${offset.x},${offset.y}`),
    input({ defaultValue: "editable" }).width(20),
  ).onKey((event) => {
    if (event.key === "f2") {
      // Preserve a tracking failure so the PTY runner observes a failed child process.
      void app.selection
        .setMode(app.selection.mode === "text" ? "native" : "text")
        .catch((cause: unknown) => {
          trackingFailure = { cause };
          app.stop();
        });
    }
  });
}
await createApp(Interactive, {
  mode: process.argv[2] === "inline" ? "inline" : "fullscreen",
}).run();

if (trackingFailure) throw trackingFailure.cause;
