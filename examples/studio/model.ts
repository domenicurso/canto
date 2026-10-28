export type Status = "Planned" | "In progress" | "Done";
export type Filter = "All" | Status;
export interface Issue {
  id: number;
  title: string;
  project: string;
  status: Status;
  priority: "High" | "Normal";
  notes: string;
}
export const filters: readonly Filter[] = [
  "All",
  "Planned",
  "In progress",
  "Done",
];
export const statuses: readonly Status[] = ["Planned", "In progress", "Done"];
export const initialIssues: readonly Issue[] = [
  {
    id: 104,
    title: "Make the first five minutes feel effortless",
    project: "Experience",
    status: "In progress",
    priority: "High",
    notes:
      "A good first run should explain itself.\n\nKeep the primary action obvious, give every empty state a next step, and make keyboard navigation feel natural.\n\nTry editing this brief. Changes stay in this session.",
  },
  {
    id: 103,
    title: "Give every screen a small-window layout",
    project: "Interface",
    status: "In progress",
    priority: "High",
    notes:
      "Keep the queue visible on wide terminals. On smaller screens, open one issue at a time.\n\nResize while editing: the work should stay with you.",
  },
  {
    id: 102,
    title: "Write the release story",
    project: "Launch",
    status: "Planned",
    priority: "Normal",
    notes:
      "Lead with what people can make.\n\nShow a complete workflow, then let the details speak for themselves.",
  },
  {
    id: 101,
    title: "Make selection feel familiar",
    project: "Experience",
    status: "Done",
    priority: "High",
    notes:
      "Drag across text, double-click a word, or triple-click a line.\n\nIn editors, try Ctrl/Alt + arrows and Shift to extend a selection.",
  },
  {
    id: 100,
    title: "Tighten the focus and hover states",
    project: "Interface",
    status: "Planned",
    priority: "Normal",
    notes:
      "Focus must remain visible in every panel. Mouse hover should reinforce the same hierarchy.",
  },
  {
    id: 99,
    title: "Check Unicode in the editor",
    project: "Quality",
    status: "Done",
    priority: "Normal",
    notes:
      "Try café, 界, and a combining accent: é.\n\nMoving or deleting should preserve whole graphemes.",
  },
  {
    id: 98,
    title: "Review the empty search state",
    project: "Quality",
    status: "Planned",
    priority: "Normal",
    notes:
      "An empty result is useful feedback. Keep the search accessible and offer a clear way back.",
  },
  {
    id: 97,
    title: "Prepare the launch checklist",
    project: "Launch",
    status: "Planned",
    priority: "High",
    notes:
      "Review the examples, check narrow terminals, and run the full verification suite.",
  },
];
export function matchingIssues(
  issues: readonly Issue[],
  query: string,
  filter: Filter,
): Issue[] {
  const needle = query.trim().toLocaleLowerCase();
  return issues.filter(
    (issue) =>
      (filter === "All" || issue.status === filter) &&
      `${issue.id} ${issue.title} ${issue.project}`
        .toLocaleLowerCase()
        .includes(needle),
  );
}
export function nextStatus(status: Status): Status {
  return (
    statuses[(statuses.indexOf(status) + 1) % statuses.length] ?? "Planned"
  );
}
