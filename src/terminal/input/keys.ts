import type { KeyEvent } from "../../element/events";

import { keyEvent } from "./events";

// Push only disambiguation; ordinary typing stays UTF-8 and legacy terminals ignore it.
export const keyboardStart = "\x1b[>1u";
export const keyboardStop = "\x1b[<u";

const controlKeys: Record<number, string> = {
  8: "backspace",
  9: "tab",
  10: "enter",
  13: "enter",
  27: "escape",
  127: "backspace",
};

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
  if (token.endsWith("u") || token.startsWith("27;")) return enhancedKey(token);
  const modifiers = sequenceModifiers(token.slice(0, -1).split(";")[1]);
  if (!modifiers) return undefined;
  const code = token.includes(";")
    ? token.endsWith("~")
      ? token.split(";")[0] + "~"
      : (token.at(-1) ?? "")
    : token;
  const key = keys[code];
  return key
    ? keyEvent(key, {
        ...modifiers,
        shift: token === "Z" || modifiers.shift,
      })
    : undefined;
}

function sequenceModifiers(encoded = "1") {
  const [value, event = "1"] = encoded.split(":");
  const flags = Number(value || "1") - 1;
  if (
    !Number.isInteger(flags) ||
    flags < 0 ||
    flags > 255 ||
    !["1", "2"].includes(event)
  )
    return undefined;
  return {
    shift: Boolean(flags & 1),
    alt: Boolean(flags & 2),
    ctrl: Boolean(flags & 4),
    meta: Boolean(flags & (8 | 32)),
  };
}

/** CSI-u and xterm modifyOtherKeys retain modifiers that legacy control bytes lose. */
function enhancedKey(token: string): KeyEvent | undefined {
  const other = /^27;(\d+);(\d+)~$/.exec(token);
  const unicode =
    /^(\d+(?::\d*){0,2})(?:;(\d*(?::[123])?))?(?:;([\d:]+))?u$/.exec(token);
  if (!other && !unicode) return undefined;
  const [base = "", shifted] = (unicode?.[1] ?? other?.[2] ?? "").split(":");
  const modifiers = sequenceModifiers(unicode?.[2] ?? other?.[1]);
  const code = Number(base);
  if (
    !modifiers ||
    !Number.isSafeInteger(code) ||
    code > 0x10ffff ||
    (code >= 0xd800 && code <= 0xdfff)
  )
    return undefined;
  const key = controlKeys[code];
  const associated = unicode?.[3];
  const text = associated === undefined ? undefined : unicodeText(associated);
  if (associated !== undefined && text === undefined) return undefined;
  if (key) return keyEvent(key, modifiers);
  if (
    (code < 32 && !(code === 0 && text)) ||
    (code >= 127 && code < 160) ||
    (code >= 57344 && code <= 63743)
  )
    return undefined;
  const character = String.fromCodePoint(code);
  const printable =
    modifiers.shift && shifted
      ? unicodeText(shifted)
      : modifiers.shift
        ? character.toUpperCase()
        : character;
  return keyEvent(code === 0 ? "text" : character.toLowerCase(), {
    ...modifiers,
    text:
      text ??
      (!modifiers.ctrl && !modifiers.alt && !modifiers.meta
        ? printable
        : undefined),
  });
}

function unicodeText(encoded: string): string | undefined {
  const codes = encoded.split(":").map(Number);
  if (
    codes.some(
      (code) =>
        !Number.isSafeInteger(code) ||
        code < 32 ||
        code > 0x10ffff ||
        (code >= 127 && code < 160) ||
        (code >= 0xd800 && code <= 0xdfff),
    )
  )
    return undefined;
  return codes.map((code) => String.fromCodePoint(code)).join("");
}

export function legacyKey(char: string, alt = false): KeyEvent {
  const code = char.codePointAt(0) ?? 0;
  const key =
    controlKeys[code] ??
    (code === 0
      ? " "
      : code < 32
        ? String.fromCharCode(code + (code < 27 ? 96 : 64))
        : char);
  return keyEvent(alt ? key.toLowerCase() : key, {
    alt,
    shift: alt && /^[A-Z]$/.test(char),
    ctrl: code < 32 && controlKeys[code] === undefined,
    text: code >= 32 && code !== 127 ? char : undefined,
  });
}
