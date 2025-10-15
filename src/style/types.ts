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

export type DimensionToken =
  | number
  | "hug"
  | "auto"
  | "lock"
  | "fill"
  | `${number}%`
  | `${number}fr`;

export type DimensionLimitToken = DimensionToken | "none";

export type Padding =
  | number
  | [number, number]
  | [number, number, number, number];

export type FlowAxis = "x" | "y";
export type FlowDistribution =
  | "start"
  | "center"
  | "end"
  | "between"
  | "around";
export type FlowItemDistribution = "start" | "center" | "end";
export type CrossAlignment = "start" | "center" | "end" | "stretch";
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

  width?: StyleValue<DimensionToken>;
  height?: StyleValue<DimensionToken>;
  minWidth?: StyleValue<DimensionLimitToken>;
  minHeight?: StyleValue<DimensionLimitToken>;
  maxWidth?: StyleValue<DimensionLimitToken>;
  maxHeight?: StyleValue<DimensionLimitToken>;

  flow?: StyleValue<FlowAxis>;
  gap?: StyleValue<number>;
  distribute?: StyleValue<FlowDistribution>;
  align?: StyleValue<CrossAlignment>;
  grow?: StyleValue<number>;
  shrink?: StyleValue<number>;

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
  width: DimensionToken;
  height: DimensionToken;
  minWidth: DimensionLimitToken;
  minHeight: DimensionLimitToken;
  maxWidth: DimensionLimitToken;
  maxHeight: DimensionLimitToken;
  flow: FlowAxis;
  gap: number;
  distribute: FlowDistribution;
  align: CrossAlignment;
  grow?: number;
  shrink?: number;
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
