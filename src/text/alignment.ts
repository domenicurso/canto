import type { TextAlignment } from "../style/types";

import { width } from "./columns";

export function textOffset(
  text: string,
  available: number,
  alignment?: TextAlignment,
): number {
  const remaining = Math.max(0, available - width(text));
  return alignment === "right"
    ? remaining
    : alignment === "center"
      ? Math.floor(remaining / 2)
      : 0;
}
