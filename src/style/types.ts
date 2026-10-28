export type Color = string | readonly [number, number, number];
export type Dimension = number | "content" | "fill" | `${number}%`;
export type Padding =
  | number
  | readonly [number, number]
  | readonly [number, number, number, number];
export type Alignment = "start" | "center" | "end" | "stretch";
export type Distribution =
  | "start"
  | "center"
  | "end"
  | "between"
  | "around"
  | "evenly";
export interface BorderGlyphs {
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
  top: string;
  right: string;
  bottom: string;
  left: string;
}
export type Border =
  | "none"
  | "single"
  | "rounded"
  | "double"
  | "heavy"
  | Readonly<BorderGlyphs>;
export type Underline =
  | boolean
  | "single"
  | "double"
  | "curly"
  | "dotted"
  | "dashed";
export type TextAlignment = "left" | "center" | "right";
export type StylePart = "placeholder" | "scrollbarThumb" | "scrollbarTrack";
export type Interaction =
  | "focused"
  | "hovered"
  | "pressed"
  | "disabled"
  | "selected";
export interface Style {
  foreground?: Color | null;
  background?: Color | null;
  opacity?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: Underline;
  underlineColor?: Color | null;
  strikethrough?: boolean;
  inverse?: boolean;
  textAlign?: TextAlignment;
  faint?: boolean;
  width?: Dimension;
  height?: Dimension;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  grow?: number;
  shrink?: number;
  gap?: number;
  columnGap?: number;
  rowGap?: number;
  joinBorders?: boolean;
  selectable?: boolean;
  padding?: Padding;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  border?: Border;
  borderColor?: Color | null;
  borderTopColor?: Color | null;
  borderRightColor?: Color | null;
  borderBottomColor?: Color | null;
  borderLeftColor?: Color | null;
  borderBackground?: Color | null;
  borderTop?: boolean;
  borderRight?: boolean;
  borderBottom?: boolean;
  borderLeft?: boolean;
  justify?: Distribution;
  align?: Alignment;
  alignSelf?: Alignment;
  position?: "static" | "absolute";
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  translateX?: number;
  translateY?: number;
  zIndex?: number;
  overflow?: "clip" | "visible" | "ellipsis";
  wrap?: "word" | "character" | "none";
  maxLines?: number;
}
export interface StyleDefinition {
  base: Readonly<Style>;
  variants: Partial<Record<Interaction, Readonly<Style>>>;
  compounds?: readonly {
    when: readonly Interaction[];
    style: Readonly<Style>;
  }[];
  parts?: Partial<Record<StylePart, StyleDefinition>>;
}
export function padding(
  value: Padding = 0,
): readonly [number, number, number, number] {
  if (typeof value === "number")
    return [
      Math.floor(value),
      Math.floor(value),
      Math.floor(value),
      Math.floor(value),
    ];
  if (value.length === 2)
    return [
      Math.floor(value[0]),
      Math.floor(value[1]),
      Math.floor(value[0]),
      Math.floor(value[1]),
    ];
  return [
    Math.floor(value[0]),
    Math.floor(value[1]),
    Math.floor(value[2]),
    Math.floor(value[3]),
  ];
}
