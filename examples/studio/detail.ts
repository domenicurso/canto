import type { Element, ElementRef } from "../../index";
import type { Issue } from "./model";

import {
  button,
  column,
  component,
  useRef,
  useEffect,
  input,
  row,
  scroll,
  text,
  textarea,
} from "../../index";
import { nextStatus } from "./model";
import { action, colors, field, surface } from "./theme";

export interface DetailProps {
  issue: Issue;
  compact: boolean;
  update: (
    patch: Partial<Pick<Issue, "title" | "notes" | "status" | "priority">>,
  ) => void;
  back: () => void;
}
export function Detail({ issue, compact, update, back }: DetailProps): Element {
  return column(
    row(
      compact && button("← Queue", back).use(action),
      text(`ST-${issue.id}`).color(colors.accent).bold().width("fill"),
      text(issue.project).color(colors.muted),
    ).width("fill"),
    scroll(
      column(
        text("TITLE").color(colors.muted),
        Title({ issue, compact, update, back }),
        Metadata({ issue, compact, update, back }),
        text("THE BRIEF").color(colors.muted),
        textarea({
          value: issue.notes,
          onChange: (notes) => update({ notes }),
          placeholder: "What does a good outcome look like?",
        })
          .key(issue.id)
          .use(field)
          .width("fill")
          .height(10),
        text("Changes stay in this session.").color(colors.muted),
        button(issue.status === "Done" ? "Reopen issue" : "Mark complete", () =>
          update({ status: issue.status === "Done" ? "Planned" : "Done" }),
        )
          .use(action)
          .background(colors.raised)
          .color(colors.accent),
      )
        .gap(1)
        .width("fill"),
      { scrollbar: "auto" },
    ).fill(),
  )
    .gap(1)
    .use(surface)
    .fill();
}

function Metadata({ issue, update }: DetailProps): Element {
  return row(
    button(`${issue.status === "Done" ? "✓" : "○"} ${issue.status}`, () =>
      update({ status: nextStatus(issue.status) }),
    )
      .use(action)
      .color(colors.accent),
    button(`${issue.priority === "High" ? "↑" : "−"} ${issue.priority}`, () =>
      update({
        priority: issue.priority === "High" ? "Normal" : "High",
      }),
    )
      .use(action)
      .color(colors.amber),
  ).gap(1);
}

const Title = component(({ issue, compact, update }: DetailProps): Element => {
  const ref = useRef<ElementRef | null>(null);
  useEffect(() => {
    if (compact || issue.title === "Untitled issue") ref.current?.focus();
  }, [issue.id]);
  return input({
    value: issue.title,
    onChange: (title) => update({ title }),
    placeholder: "Give this issue a title",
  })
    .use(field)
    .width("fill")
    .ref((element) => {
      ref.current = element;
    });
});
