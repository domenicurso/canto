import type { Element, ElementRef, KeyEvent } from "../../index";

import {
  column,
  createApp,
  row,
  text,
  useApp,
  useRef,
  useViewport,
} from "../../index";
import { Footer, Header, Overview } from "./chrome";
import { Detail } from "./detail";
import { Queue } from "./queue";
import { colors } from "./theme";
import { useWorkspace } from "./workspace";

function useShortcuts(workspace: ReturnType<typeof useWorkspace>) {
  const app = useApp();
  const search = useRef<ElementRef | null>(null);
  const toggleSelection = async (): Promise<void> => {
    try {
      await app.selection.setMode(
        app.selection.mode === "text" ? "native" : "text",
      );
      workspace.setMessage(`Selection: ${app.selection.mode} · F2 to switch`);
    } catch (error) {
      workspace.setMessage(
        error instanceof Error ? error.message : String(error),
      );
    }
  };
  const onKey = (event: KeyEvent): void => {
    if (event.defaultPrevented) return;
    if (event.ctrl && event.key === "f") {
      event.preventDefault();
      workspace.setDetailOpen(false);
      search.current?.focus();
    }
    if (event.ctrl && event.key === "n") {
      event.preventDefault();
      workspace.create();
    }
    if (event.key === "escape") {
      event.preventDefault();
      workspace.setDetailOpen(false);
      workspace.setQuery("");
    }
    if (event.key === "f2") {
      event.preventDefault();
      // Mode errors are reported in the status bar.
      void toggleSelection();
    }
  };
  return {
    onKey,
    searchRef: (element: ElementRef | null): void => {
      search.current = element;
    },
  };
}
export function Studio(): Element {
  const workspace = useWorkspace();
  const shortcuts = useShortcuts(workspace);
  const { width, height } = useViewport();
  const compact = width < 92;
  const queue = Queue({
    issues: workspace.visible,
    selected: workspace.issue?.id,
    query: workspace.query,
    filter: workspace.filter,
    searchRef: shortcuts.searchRef,
    search: workspace.setQuery,
    filterBy: workspace.setFilter,
    open: workspace.open,
    select: workspace.select,
  });
  const detail =
    workspace.issue &&
    Detail({
      issue: workspace.issue,
      compact,
      update: workspace.update,
      back: () => workspace.setDetailOpen(false),
    }).key(workspace.issue.id);
  const content = compact
    ? workspace.detailOpen && detail
      ? detail
      : queue
    : row(
        width >= 128 && height >= 27 && Overview(workspace.issues),
        queue.width("fill"),
        detail?.width("fill"),
      )
        .joinBorders()
        .fill();
  return column(
    Header(workspace.create),
    height >= 18 && text("Make room for good work.").color(colors.muted),
    content,
    Footer(workspace.message, width),
  )
    .gap(height >= 18 ? 1 : 0)
    .padding(width >= 60 && height >= 16 ? 1 : 0)
    .fill()
    .background(colors.base)
    .color(colors.ink)
    .onKey(shortcuts.onKey);
}
if (import.meta.main) await createApp(Studio).run();
