export type {
  Color,
  Dimension,
  HorizontalAlign,
  Padding,
  ResolvedStyle,
  StyleMap,
  StyleSnapshot,
  TextWrap,
  VerticalAlign,
  BoxPadding,
} from "./types";
export { DEFAULT_STYLE_SNAPSHOT } from "./types";
export {
  createDefaultStyle,
  expandPadding,
  resolveStyle,
  resolvePadding,
} from "./inheritance";
export { colorToAnsi } from "./colors";
