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

export type PositionMode = "static" | "absolute";

export type Inset =
  | number
  | [number, number]
  | [number, number, number, number];

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

export type ForegroundStyle = StyleValue<Color | null>;
export type BackgroundStyle = StyleValue<Color | null>;
export type BoldStyle = StyleValue<boolean>;
export type ItalicStyle = StyleValue<boolean>;
export type UnderlineStyle = StyleValue<boolean>;
export type FaintStyle = StyleValue<boolean>;

export type PaddingStyle = StyleValue<Padding>;
export type PaddingTopStyle = StyleValue<number>;
export type PaddingRightStyle = StyleValue<number>;
export type PaddingBottomStyle = StyleValue<number>;
export type PaddingLeftStyle = StyleValue<number>;

export type WidthStyle = StyleValue<DimensionToken>;
export type HeightStyle = StyleValue<DimensionToken>;
export type MinWidthStyle = StyleValue<DimensionLimitToken>;
export type MinHeightStyle = StyleValue<DimensionLimitToken>;
export type MaxWidthStyle = StyleValue<DimensionLimitToken>;
export type MaxHeightStyle = StyleValue<DimensionLimitToken>;

export type FlowStyle = StyleValue<FlowAxis>;
export type GapStyle = StyleValue<number>;
export type DistributeStyle = StyleValue<FlowDistribution>;
export type AlignStyle = StyleValue<CrossAlignment>;
export type GrowStyle = StyleValue<number>;
export type ShrinkStyle = StyleValue<number>;

export type PositionStyle = StyleValue<PositionMode>;
export type InsetStyle = StyleValue<Inset>;
export type TopStyle = StyleValue<number | null>;
export type RightStyle = StyleValue<number | null>;
export type BottomStyle = StyleValue<number | null>;
export type LeftStyle = StyleValue<number | null>;
export type ZIndexStyle = StyleValue<number>;

export type TextWrapStyle = StyleValue<TextWrap>;
export type LineClampStyle = StyleValue<number | null>;

export type ScrollXStyle = StyleValue<boolean>;
export type ScrollYStyle = StyleValue<boolean>;
export type ScrollbarBackgroundStyle = StyleValue<Color | null>;
export type ScrollbarForegroundStyle = StyleValue<Color | null>;

export interface StyleMap {
  foreground?: ForegroundStyle;
  background?: BackgroundStyle;
  bold?: BoldStyle;
  italic?: ItalicStyle;
  underline?: UnderlineStyle;
  faint?: FaintStyle;

  padding?: PaddingStyle;
  paddingTop?: PaddingTopStyle;
  paddingRight?: PaddingRightStyle;
  paddingBottom?: PaddingBottomStyle;
  paddingLeft?: PaddingLeftStyle;

  width?: WidthStyle;
  height?: HeightStyle;
  minWidth?: MinWidthStyle;
  minHeight?: MinHeightStyle;
  maxWidth?: MaxWidthStyle;
  maxHeight?: MaxHeightStyle;

  flow?: FlowStyle;
  gap?: GapStyle;
  distribute?: DistributeStyle;
  align?: AlignStyle;
  grow?: GrowStyle;
  shrink?: ShrinkStyle;

  position?: PositionStyle;
  inset?: InsetStyle;
  top?: TopStyle;
  right?: RightStyle;
  bottom?: BottomStyle;
  left?: LeftStyle;
  zIndex?: ZIndexStyle;

  textWrap?: TextWrapStyle;
  lineClamp?: LineClampStyle;

  scrollX?: ScrollXStyle;
  scrollY?: ScrollYStyle;
  scrollbarBackground?: ScrollbarBackgroundStyle;
  scrollbarForeground?: ScrollbarForegroundStyle;
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
  lineClamp: number | null;
  scrollX: boolean;
  scrollY: boolean;
  scrollbarBackground: Color | null;
  scrollbarForeground: Color | null;
  position: PositionMode;
  top: number | null;
  right: number | null;
  bottom: number | null;
  left: number | null;
  zIndex: number;
}

export const DEFAULT_STYLE_SNAPSHOT: StyleSnapshot = {
  foreground: null,
  background: null,
  bold: false,
  italic: false,
  underline: false,
  faint: false,
};
