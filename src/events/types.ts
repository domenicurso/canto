export type Event = KeyPressEvent | TextInputEvent | MouseEvent | ResizeEvent;

export interface KeyPressEvent {
  type: "KeyPress";
  key: string;
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
