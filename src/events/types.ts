export enum Key {
  // Special keys
  Backspace = "backspace",
  Delete = "delete",
  Tab = "tab",
  Escape = "escape",
  Return = "return",

  // Arrow keys
  ArrowLeft = "arrowleft",
  ArrowRight = "arrowright",
  ArrowUp = "arrowup",
  ArrowDown = "arrowdown",

  // Navigation keys
  Home = "home",
  End = "end",
  PageUp = "pageup",
  PageDown = "pagedown",

  // Common letter keys
  A = "a",
  B = "b",
  C = "c",
  D = "d",
  E = "e",
  F = "f",
  G = "g",
  H = "h",
  I = "i",
  J = "j",
  K = "k",
  L = "l",
  M = "m",
  N = "n",
  O = "o",
  P = "p",
  Q = "q",
  R = "r",
  S = "s",
  T = "t",
  U = "u",
  V = "v",
  W = "w",
  X = "x",
  Y = "y",
  Z = "z",

  // Function keys
  F1 = "f1",
  F2 = "f2",
  F3 = "f3",
  F4 = "f4",
  F5 = "f5",
  F6 = "f6",
  F7 = "f7",
  F8 = "f8",
  F9 = "f9",
  F10 = "f10",
  F11 = "f11",
  F12 = "f12",
}

export type Event = KeyPressEvent | TextInputEvent | MouseEvent | ResizeEvent;

export interface KeyPressEvent {
  type: "KeyPress";
  key: Key | string; // Allow both enum values and arbitrary strings for flexibility
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
}

export interface TextInputEvent {
  type: "TextInput";
  text: string;
}

export interface MouseEvent {
  type: "Mouse";
  action: "press" | "release" | "move" | "scroll";
  button?: "left" | "right" | "middle";
  x: number;
  y: number;
  scrollDelta?: { x: number; y: number };
}

export interface ResizeEvent {
  type: "Resize";
  width: number;
  height: number;
}

export type SurfacePhase = "pre" | "post";

export type SurfaceEventEnvelope =
  | { phase: "pre"; event: Event } // before Surface handles it
  | { phase: "post"; event: Event; handled: boolean }; // after dispatch()

export type SurfaceMiddleware = (ev: Event, next: () => boolean) => boolean;
// return: the "handled" boolean you want to propagate (usually next())
