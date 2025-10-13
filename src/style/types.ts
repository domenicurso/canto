import type { Signal } from "../signals";

export type Color =
  | "black"
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "magenta"
  | "cyan"
  | "white"
  | "brightBlack"
  | "brightRed"
  | "brightGreen"
  | "brightYellow"
  | "brightBlue"
  | "brightMagenta"
  | "brightCyan"
  | "brightWhite"
  | [number, number, number]
  | `#${string}`;

export type Dimension = number | "auto" | "fill" | `${number}%`;

export type Padding =
  | number
  | [number, number]
  | [number, number, number, number];

export type HorizontalAlign = "left" | "center" | "right";
export type VerticalAlign = "top" | "center" | "bottom";
export type TextWrap = "none" | "word" | "char";

export type StyleValue<T> = T | Signal<T>;

export interface StyleMap {
  foreground?: StyleValue<Color | null>;
  background?: StyleValue<Color | null>;
  bold?: StyleValue<boolean>;
  italic?: StyleValue<boolean>;
  underline?: StyleValue<boolean>;
  faint?: StyleValue<boolean>;

  padding?: StyleValue<Padding>;
  paddingTop?: StyleValue<number>;
  paddingRight?: StyleValue<number>;
  paddingBottom?: StyleValue<number>;
  paddingLeft?: StyleValue<number>;

  width?: StyleValue<Dimension>;
  height?: StyleValue<Dimension>;
  minWidth?: StyleValue<Dimension>;
  minHeight?: StyleValue<Dimension>;
  maxWidth?: StyleValue<Dimension>;
  maxHeight?: StyleValue<Dimension>;

  xAlign?: StyleValue<HorizontalAlign>;
  yAlign?: StyleValue<VerticalAlign>;

  gap?: StyleValue<number>;
  textWrap?: StyleValue<TextWrap>;

  scrollX?: StyleValue<boolean>;
  scrollY?: StyleValue<boolean>;
  scrollbarBackground?: StyleValue<Color | null>;
  scrollbarForeground?: StyleValue<Color | null>;
}

export interface BoxPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface StyleSnapshot {
  foreground: Color | null;
  background: Color | null;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  faint: boolean;
}

export interface ResolvedStyle extends StyleSnapshot {
  padding: BoxPadding;
  width?: Dimension;
  height?: Dimension;
  minWidth?: Dimension;
  minHeight?: Dimension;
  maxWidth?: Dimension;
  maxHeight?: Dimension;
  xAlign: HorizontalAlign;
  yAlign: VerticalAlign;
  gap: number;
  textWrap: TextWrap;
  scrollX: boolean;
  scrollY: boolean;
  scrollbarBackground: Color | null;
  scrollbarForeground: Color | null;
}

export const DEFAULT_STYLE_SNAPSHOT: StyleSnapshot = {
  foreground: null,
  background: null,
  bold: false,
  italic: false,
  underline: false,
  faint: false,
};
