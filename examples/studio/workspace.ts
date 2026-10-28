import type { Filter, Issue } from "./model";

import { useRef, useState } from "../../index";
import { initialIssues, matchingIssues } from "./model";

function useIssueStore() {
  const [issues, setIssues] = useState<Issue[]>(() =>
    initialIssues.map((issue) => ({ ...issue })),
  );
  const nextId = useRef(
    Math.max(...initialIssues.map((issue) => issue.id)) + 1,
  );
  const create = (): number => {
    const id = nextId.current++;
    const issue: Issue = {
      id,
      title: "Untitled issue",
      project: "Experience",
      status: "Planned",
      priority: "Normal",
      notes: "",
    };
    setIssues((previous) => [issue, ...previous]);
    return id;
  };
  const update = (
    id: number,
    patch: Partial<Pick<Issue, "title" | "notes" | "status" | "priority">>,
  ): void => {
    setIssues((previous) =>
      previous.map((issue) =>
        issue.id === id ? { ...issue, ...patch } : issue,
      ),
    );
  };
  return { issues, create, update };
}
export function useWorkspace() {
  const store = useIssueStore();
  const { issues } = store;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [selected, setSelected] = useState(104);
  const [detailOpen, setDetailOpen] = useState(false);
  const [message, setMessage] = useState(
    "Session workspace · edits are temporary",
  );
  const visible = matchingIssues(issues, query, filter);
  const issue = visible.find((item) => item.id === selected) ?? visible[0];
  const open = (id: number): void => {
    setSelected(id);
    setDetailOpen(true);
  };
  const create = (): void => {
    const id = store.create();
    setQuery("");
    setFilter("All");
    open(id);
    setMessage(`Created ST-${id} · ready for your brief`);
  };
  const update = (
    patch: Partial<Pick<Issue, "title" | "notes" | "status" | "priority">>,
  ): void => {
    if (!issue) return;
    store.update(issue.id, patch);
    setMessage(`Updated ST-${issue.id} · session only`);
  };
  return {
    issues,
    visible,
    issue,
    query,
    setQuery,
    filter,
    setFilter,
    detailOpen,
    setDetailOpen,
    message,
    setMessage,
    open,
    select: setSelected,
    create,
    update,
  };
}
