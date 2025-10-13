export {
  state,
  computed,
  effect,
  batch,
  isSignal,
  unwrapMaybeSignal,
} from "./src/signals";
export type { Signal, ComputedSignal, EffectHandle } from "./src/signals";

export {
  VStack,
  HStack,
  Text,
  Input,
  Textarea,
  Scrollable,
  Conditional,
} from "./src/widgets";
export type {
  Node,
  NodeType,
  TextProps,
  InputProps,
  TextareaProps,
  ScrollableProps,
  ContainerProps,
  PropsMap,
} from "./src/widgets";

export { Renderer } from "./src/renderer";
export type {
  RenderOptions,
  RenderMode,
  CursorPolicy,
  RenderResult,
} from "./src/renderer";

export {
  Surface,
  collectFocusableNodes,
  findNodeById,
  isActivationKey,
  isNavigationKey,
  isScrollEvent,
} from "./src/events";
export type {
  Event,
  KeyPressEvent,
  TextInputEvent,
  MouseEvent,
  ResizeEvent,
} from "./src/events";

export {
  constraints,
  tight,
  loose,
  clamp,
  clampSize,
  resolveDimension,
  wrapText,
} from "./src/layout";
export type { Constraints } from "./src/layout";

export {
  createDefaultStyle,
  resolveStyle,
  expandPadding,
  resolvePadding,
  colorToAnsi,
  DEFAULT_STYLE_SNAPSHOT,
} from "./src/style";
export type {
  StyleMap,
  StyleSnapshot,
  ResolvedStyle,
  Color,
  Dimension,
  Padding,
  HorizontalAlign,
  VerticalAlign,
  TextWrap,
  BoxPadding,
} from "./src/style";

export type {
  Point,
  Size,
  Rect,
  Span,
  PaintResult,
  LayoutRect,
} from "./src/types";
