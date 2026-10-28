import type { Element, ElementRef } from "../index";

import {
  button,
  column,
  createApp,
  input,
  overlay,
  row,
  scroll,
  style,
  text,
  useApp,
  useRef,
  useState,
} from "../index";

const action = style()
  .color("cyan")
  .padding([0, 1])
  .focused(style().background("#164e63").bold());
const panel = style()
  .border("rounded")
  .borderColor("cyan")
  .background("#17232c")
  .padding(1);
function confirm(options: {
  title: string;
  edit: (value: string) => void;
  publish: () => void;
  close: () => void;
}): Element {
  const { close } = options;
  return overlay({
    modal: true,
    onDismiss: close,
    content: column(
      text("Publish this draft?").bold(),
      scroll(
        column(
          text("This example changes local UI state only.").selectable(),
          input({ value: options.title, onChange: options.edit })
            .border("single")
            .width("fill")
            .autoFocus(),
        )
          .gap(1)
          .width("fill"),
      ).fill(),
      row(
        button("Publish", options.publish).use(action),
        button("Cancel", close).use(action),
      ).gap(2),
    )
      .gap(1)
      .fill(),
  })
    .width(48)
    .height(14)
    .use(panel);
}
function useDraft() {
  const app = useApp();
  const [menu, setMenu] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [title, setTitle] = useState("Release notes");
  const [status, setStatus] = useState("Draft ready");
  const anchor = useRef<ElementRef | null>(null);
  return {
    app,
    menu,
    setMenu,
    dialog,
    setDialog,
    title,
    setTitle,
    status,
    setStatus,
    anchor,
  };
}
export function Overlays(): Element {
  const draft = useDraft();
  return column(
    text("Unstyled overlay behavior").bold(),
    text(
      "Both the menu and dialog below use overlay(). Their styling is defined in this example.",
    ).selectable(),
    controls(
      (ref) => {
        draft.anchor.current = ref;
      },
      () => draft.setMenu(!draft.menu),
      () => draft.setDialog(true),
      () => draft.app.stop(),
    ),
    text(draft.status).color("green"),
    text(
      "Tab / Shift+Tab · Escape dismisses · outside presses dismiss\nThe modal traps focus and restores it when closed.",
    ).dim(),
    draft.menu &&
      actionMenu({
        anchor: () => draft.anchor.current?.rect,
        close: () => draft.setMenu(false),
        review: () => {
          draft.setMenu(false);
          draft.setDialog(true);
        },
        reset: () => {
          draft.setStatus("Draft ready");
          draft.setMenu(false);
        },
      }),
    draft.dialog &&
      confirm({
        title: draft.title,
        edit: draft.setTitle,
        publish: () => {
          draft.setStatus(`Published in this session: ${draft.title}`);
          draft.setDialog(false);
        },
        close: () => draft.setDialog(false),
      }),
  )
    .gap(1)
    .padding(1)
    .fill()
    .background("#0c141a")
    .color("white");
}
function controls(
  anchor: (ref: ElementRef | null) => void,
  menu: () => void,
  review: () => void,
  quit: () => void,
): Element {
  return row(
    button("Actions", menu).use(action).autoFocus().ref(anchor),
    button("Review draft", review).use(action),
    button("Quit", quit).use(action),
  ).gap(2);
}
function actionMenu(options: {
  anchor: () => ElementRef["rect"] | undefined;
  review: () => void;
  reset: () => void;
  close: () => void;
}): Element {
  return overlay({
    anchor: options.anchor,
    placement: "bottom-start",
    offset: 1,
    focus: "first",
    onDismiss: options.close,
    content: column(
      button("Review draft", options.review).use(action),
      button("Reset status", options.reset).use(action),
    ).gap(1),
  })
    .width(24)
    .use(panel);
}
if (import.meta.main) await createApp(Overlays).run();
