import type { Element, ElementRef, KeyEvent } from "../../index";
import type { Filter, Issue } from "./model";

import {
  button,
  column,
  component,
  input,
  row,
  scroll,
  style,
  text,
  useRef,
  useViewport,
} from "../../index";
import { filters } from "./model";
import { action, colors, field, surface } from "./theme";

export interface QueueProps {
  issues: readonly Issue[];
  selected?: number;
  query: string;
  filter: Filter;
  searchRef: (element: ElementRef | null) => void;
  search: (value: string) => void;
  filterBy: (filter: Filter) => void;
  open: (id: number) => void;
  select: (id: number) => void;
}
function useQueueNavigation(props: QueueProps) {
  const listRef = useRef<ElementRef | null>(null);
  const rows = useRef(new Map<number, ElementRef>());
  const move = (event: KeyEvent): void => {
    if (event.key !== "up" && event.key !== "down") return;
    event.preventDefault();
    const current = props.issues.findIndex(
      (issue) => issue.id === props.selected,
    );
    const index = Math.max(
      0,
      Math.min(
        props.issues.length - 1,
        current + (event.key === "up" ? -1 : 1),
      ),
    );
    const issue = props.issues[index];
    if (issue) {
      props.select(issue.id);
      rows.current.get(issue.id)?.focus();
    }
    const viewport = listRef.current?.rect.height ?? 1;
    listRef.current?.scrollTo(Math.max(0, index * 3 - viewport + 3));
  };
  return { listRef, rows, move };
}
export const Queue = component((props: QueueProps): Element => {
  const { listRef, rows, move } = useQueueNavigation(props);
  const { width, height } = useViewport();
  return column(
    height >= 14 &&
      row(
        text("Release queue").bold().width("fill"),
        text(
          `${props.issues.length} ${props.issues.length === 1 ? "issue" : "issues"}`,
        ).color(colors.muted),
      ),
    input({
      value: props.query,
      onChange: props.search,
      placeholder: "Search issues…  Ctrl+F",
      onSubmit: () => {
        if (props.issues[0]) props.open(props.issues[0].id);
      },
    })
      .use(field)
      .border(height < 14 ? "none" : "rounded")
      .width("fill")
      .autoFocus()
      .ref(props.searchRef),
    height >= 14 && FilterBar(props, width),
    scroll(
      column(
        props.issues.length
          ? props.issues.map((issue) => issueRow(issue, props, rows.current))
          : emptyState(props),
      ).width("fill"),
      { scrollbar: "auto" },
    )
      .fill()
      .ref((element) => {
        listRef.current = element;
      })
      .onKey(move),
  )
    .use(surface)
    .gap(height < 20 ? 0 : 1)
    .border(height < 14 ? "none" : "rounded")
    .fill();
});
function issueRow(
  issue: Issue,
  props: QueueProps,
  rows: Map<number, ElementRef>,
): Element {
  const selected = issue.id === props.selected;
  return button(
    column(
      row(
        text(selected ? "▎" : " ").color(colors.accent),
        text(issue.title).width("fill").maxLines(1).overflow("ellipsis"),
      ),
      text(`  ST-${issue.id}  ·  ${issue.project}  ·  ${issue.status}`)
        .color(selected ? colors.accent : colors.muted)
        .maxLines(1)
        .overflow("ellipsis"),
    ).width("fill"),
    () => props.open(issue.id),
  )
    .key(issue.id)
    .onFocus(() => props.select(issue.id))
    .ref((element) => {
      if (element) rows.set(issue.id, element);
      else rows.delete(issue.id);
    })
    .width("fill")
    .height(3)
    .background(selected ? colors.raised : colors.panel)
    .hovered(style().background(colors.raised))
    .focused(style().background(colors.raised).color(colors.accent))
    .padding([0, 1]);
}
function emptyState(props: QueueProps): Element {
  return column(
    text("No matching issues").bold(),
    text("Try another phrase or clear the filters.").color(colors.muted),
    button("Clear search and filters", () => {
      props.search("");
      props.filterBy("All");
    }).use(action),
  )
    .gap(1)
    .padding([1, 0]);
}

function FilterBar(props: QueueProps, width: number): Element {
  const choices = width < 48 ? [props.filter] : filters;
  return row(
    choices.map((filter) =>
      button(
        width < 48
          ? `${filter} ▾`
          : filter === "In progress"
            ? "Active"
            : filter,
        () =>
          props.filterBy(
            width < 48
              ? (filters[(filters.indexOf(filter) + 1) % filters.length] ??
                  "All")
              : filter,
          ),
      )
        .use(action)
        .color(props.filter === filter ? colors.accent : colors.muted),
    ),
  ).width("fill");
}
