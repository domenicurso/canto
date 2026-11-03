import type { KeyEvent } from "../../element/events";
import type { Rect, Size } from "../../layout/geometry";

export type DebugPlacement = "overlay" | "sidebar";
export interface DebugControl {
  readonly visible: boolean;
  readonly picking: boolean;
  readonly placement: DebugPlacement;
  setVisible(visible: boolean): void;
  setPicking(picking: boolean): void;
  setPlacement(placement: DebugPlacement): void;
  toggle(): void;
}
export interface DebugView {
  tab: "stats" | "elements";
  picking: boolean;
  placement: DebugPlacement;
}

export function sidebarWidth(width: number): number {
  return width < 50 ? 0 : Math.min(60, Math.max(30, Math.floor(width * 0.42)));
}

export function debugBounds(size: Size, view: DebugView): Rect {
  if (view.placement === "sidebar" && sidebarWidth(size.width) > 0) {
    const width = sidebarWidth(size.width);
    return { x: size.width - width, y: 0, width, height: size.height };
  }
  const full = view.tab === "elements" && !view.picking;
  const width = Math.min(full ? 100 : 60, Math.max(0, size.width));
  const height = Math.min(
    view.picking ? 1 : full ? 36 : 14,
    Math.max(0, size.height),
  );
  return {
    x: size.width - width,
    y: size.height - height,
    width,
    height,
  };
}

export function debugShortcut(
  event: KeyEvent,
  enabled: boolean,
): "pick" | "toggle" | "escape" | "navigate" | undefined {
  if (
    enabled &&
    event.ctrl &&
    event.shift &&
    !event.alt &&
    !event.meta &&
    event.key.toLowerCase() === "i"
  )
    return "pick";
  if (
    event.ctrl ||
    event.alt ||
    event.meta ||
    (event.shift && event.key !== "tab")
  )
    return undefined;
  if (event.key === "escape") return "escape";
  if (enabled && event.key === "f3") return "toggle";
  return "navigate";
}
