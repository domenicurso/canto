import type { MouseEvent } from "./types";

export function isScrollEvent(event: MouseEvent): boolean {
  return event.action === "scroll";
}
