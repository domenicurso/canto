import type { KeyEvent } from "../element/events";

import { keyEvent } from "./events";

const keys: Record<string, string> = {
  A: "up",
  B: "down",
  C: "right",
  D: "left",
  H: "home",
  F: "end",
  Z: "tab",
  "1~": "home",
  "2~": "insert",
  "3~": "delete",
  "4~": "end",
  "5~": "pageup",
  "6~": "pagedown",
  "7~": "home",
  "8~": "end",
  P: "f1",
  Q: "f2",
  R: "f3",
  S: "f4",
  "11~": "f1",
  "12~": "f2",
  "13~": "f3",
  "14~": "f4",
  "15~": "f5",
  "17~": "f6",
  "18~": "f7",
  "19~": "f8",
  "20~": "f9",
  "21~": "f10",
  "23~": "f11",
  "24~": "f12",
};
export function decodeKeySequence(token: string): KeyEvent | undefined {
  const modifier = Number(token.split(";")[1]?.replace(/\D/g, "") ?? 1) - 1;
  const code = token.includes(";")
    ? token.endsWith("~")
      ? token.split(";")[0] + "~"
      : (token.at(-1) ?? "")
    : token;
  const key = keys[code];
  return key
    ? keyEvent(key, {
        shift: token === "Z" || Boolean(modifier & 1),
        alt: Boolean(modifier & 2),
        ctrl: Boolean(modifier & 4),
        meta: Boolean(modifier & 8),
      })
    : undefined;
}
