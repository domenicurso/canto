import type { Signal } from "../signals";

export interface TextProps {
  content?: string | Signal<string>;
}

export interface InputProps {
  placeholder?: string | Signal<string>;
  disabled?: boolean | Signal<boolean>;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  filter?: (value: string) => string;
  validator?: (value: string) => boolean;
}

export interface TextareaProps {
  placeholder?: string | Signal<string>;
  disabled?: boolean | Signal<boolean>;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  filter?: (value: string) => string;
  validator?: (value: string) => boolean;
}

export interface ScrollableProps {
  scrollX?: Signal<number>;
  scrollY?: Signal<number>;
  onScroll?: (x: number, y: number) => void;
  scrollStep?: number;
  scrollWheelEnabled?: boolean;
}

export interface ButtonProps {
  label?: string | Signal<string>;
  disabled?: boolean | Signal<boolean>;
  onPress?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export interface ContainerProps {
  focusable?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onSubmit?: () => void;
}

export interface ImageProps {
  path?: string | Signal<string>;
  cellAspectRatio?: number | Signal<number>;
}

export type NodeProps =
  | TextProps
  | InputProps
  | TextareaProps
  | ScrollableProps
  | ButtonProps
  | ContainerProps
  | ImageProps;

export type PropsMap = NodeProps;
