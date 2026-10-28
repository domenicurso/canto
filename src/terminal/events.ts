import type { KeyEvent, PointerEvent } from "../element/events";

export type TerminalEvent =
  | { type: "key"; event: KeyEvent }
  | { type: "mouse"; event: PointerEvent }
  | { type: "resize" };
export function keyEvent(
  key: string,
  options: Partial<
    Pick<KeyEvent, "text" | "ctrl" | "alt" | "shift" | "meta">
  > = {},
): KeyEvent {
  let prevented = false;
  let stopped = false;
  return {
    key,
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
    ...options,
    get defaultPrevented() {
      return prevented;
    },
    get propagationStopped() {
      return stopped;
    },
    preventDefault() {
      prevented = true;
    },
    stopPropagation() {
      stopped = true;
    },
  };
}
