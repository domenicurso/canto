export type Color = string | readonly [number, number, number];
export type Dimension = number | "content" | "fill" | `${number}%`;
export type Padding =
  | number
  | readonly [number, number]
  | readonly [number, number, number, number];
export type Alignment = "start" | "center" | "end" | "stretch";
export type Distribution = "start" | "center" | "end" | "between" | "around" | "evenly";
export type Border = "none" | "single" | "rounded" | "double" | "heavy";
export type Interaction = "focused" | "hovered" | "pressed" | "disabled" | "selected";
export interface Style {
  foreground?: Color | null;
  background?: Color | null;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
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
  padding?: Padding;
  border?: Border;
  borderColor?: Color | null;
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
  zIndex?: number;
  overflow?: "clip" | "visible" | "ellipsis";
  wrap?: "word" | "character" | "none";
  maxLines?: number;
}
export interface StyleDefinition {
  base: Readonly<Style>;
  variants: Partial<Record<Interaction, Readonly<Style>>>;
}
export function padding(value: Padding = 0): readonly [number, number, number, number] {
  if (typeof value === "number")
    return [Math.floor(value), Math.floor(value), Math.floor(value), Math.floor(value)];
  if (value.length === 2)
    return [Math.floor(value[0]), Math.floor(value[1]), Math.floor(value[0]), Math.floor(value[1])];
  return [Math.floor(value[0]), Math.floor(value[1]), Math.floor(value[2]), Math.floor(value[3])];
}
