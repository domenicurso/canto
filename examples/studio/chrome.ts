import type { Element } from "../../index";
import type { Issue } from "./model";

import { button, column, row, text } from "../../index";
import { action, colors, surface } from "./theme";

export function Header(create: () => void): Element {
  return row(
    text("◈ STUDIO").bold().color(colors.accent),
    text(" /  Canto v2").color(colors.muted).width("fill"),
    button("+ New issue", create).use(action).color(colors.accent),
  )
    .height(1)
    .width("fill");
}
export function Overview(issues: readonly Issue[]): Element {
  const done = issues.filter((issue) => issue.status === "Done").length;
  const active = issues.filter(
    (issue) => issue.status === "In progress",
  ).length;
  const progress = Math.round((done / Math.max(1, issues.length)) * 12);
  return column(
    text("WORKSPACE").color(colors.muted),
    text("The next release").bold(),
    text("Small details.\nA better everyday tool.").color(colors.muted),
    text("RELEASE PROGRESS").color(colors.muted),
    text(`${"━".repeat(progress)}${"─".repeat(12 - progress)}`).color(
      colors.accent,
    ),
    text(`${done} of ${issues.length} complete`).color(colors.muted),
    text(`${active} in progress`).color(colors.amber),
    text("PROJECTS").color(colors.muted),
    text("Experience\nInterface\nLaunch\nQuality").color(colors.ink),
  )
    .gap(1)
    .use(surface)
    .width(25)
    .height("fill");
}
export function Footer(message: string, width: number): Element {
  return row(
    text(message)
      .color(colors.accent)
      .width("fill")
      .maxLines(1)
      .overflow("ellipsis"),
    text(
      width >= 90
        ? "Ctrl+F search · Ctrl+N new · F2 selection · Ctrl+C quit"
        : width >= 60
          ? "^F find · ^N new · Esc back · ^C quit"
          : "^F find · ^N new · ^C quit",
    )
      .color(colors.muted)
      .maxLines(1)
      .overflow("ellipsis"),
  )
    .width("fill")
    .height(1);
}
