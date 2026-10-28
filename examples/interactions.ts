import type { KeyEvent } from "../index";

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
  textarea,
  useApp,
  useState,
} from "../index";

const CopyControls = component(() => {
  const app = useApp();
  const [message, setMessage] = useState(
    "Copy a sample through the clipboard adapter.",
  );
  const copy = async (): Promise<void> => {
    try {
      await app.clipboard.writeText("Hello from Canto — 界");
      setMessage("Clipboard request sent; paste into another app to check it.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };
  return column(
    row(
      button("Copy sample", () => {
        // The handler reports clipboard failures in the view.
        void copy();
      }),
      button("Quit", () => app.stop()),
    ).gap(2),
    text(message).dim(),
  );
});
function useSelectionToggle() {
  const app = useApp();
  const [status, setStatus] = useState(
    "F2: native terminal selection · current: text",
  );
  const toggle = async (): Promise<void> => {
    try {
      await app.selection.setMode(
        app.selection.mode === "text" ? "native" : "text",
      );
      setStatus(`F2: switch selection · current: ${app.selection.mode}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  };
  return {
    status,
    onKey: (event: KeyEvent): void => {
      if (event.key === "f2") {
        event.preventDefault();
        // The toggle displays tracking failures in the view.
        void toggle();
      }
    },
  };
}
const selectedText = style().selected(
  style().background("blue").color("white"),
);
export function Interactions() {
  const selection = useSelectionToggle();
  return column(
    text("Pointer and clipboard playground").bold().color("cyan"),
    text(selection.status).color("cyan"),
    text(
      "Drag across text; double-click words, triple-click lines. Alt+W copies; Ctrl+X cuts.",
    ).use(selectedText),
    text(
      "Ctrl/Alt+arrows move by word; Shift extends. Paste with your terminal shortcut.",
    )
      .dim()
      .use(selectedText),
    input({ defaultValue: "Select a word, then copy or replace it." })
      .width("fill")
      .selected(style().background("blue").color("white")),
    textarea({
      defaultValue:
        "Multiline selection\nUnicode: 界 and é\nTry dragging across lines.",
    })
      .height(4)
      .width("fill")
      .border("rounded"),
    scroll(
      column(
        Array.from({ length: 80 }, (_, i) =>
          text(
            `Row ${String(i).padStart(2, "0")} · ${"A wide row of selectable text. ".repeat(5)}`,
          ).use(selectedText),
        ),
      ),
      { axis: "both", scrollbar: "visible" },
    ).fill(),
    CopyControls(),
  )
    .padding(1)
    .gap(1)
    .fill()
    .onKey(selection.onKey);
}
if (import.meta.main) await createApp(Interactions).run();
