import type { ElementEvents } from "./events";
import type { OverlayProps } from "./overlay";
import type { CanvasOptions } from "./pixels";

export type ValueProps =
  | { value: string; onChange: (value: string) => void; defaultValue?: never }
  | {
      defaultValue?: string;
      value?: never;
      onChange?: (value: string) => void;
    };
export type InputProps = ValueProps & {
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  onSubmit?: (value: string) => void;
};
export interface ButtonProps {
  onPress: () => void;
  disabled?: boolean;
}
export interface ScrollPosition {
  x: number;
  y: number;
}
type ScrollControl<T> =
  | { offset: T; onScroll: (offset: T) => void; defaultOffset?: never }
  | { offset?: never; defaultOffset?: T; onScroll?: (offset: T) => void };
interface ScrollAppearance {
  scrollbar?: "auto" | "hidden" | "visible";
  gutter?: "auto" | "stable";
  physics?: "instant" | { friction?: number; momentum?: number };
}
export type ScrollProps = ScrollAppearance &
  (
    | ({ axis?: "vertical" | "horizontal" } & ScrollControl<number>)
    | ({ axis: "both" } & ScrollControl<ScrollPosition>)
  );
export interface ElementProps extends ElementEvents {
  canvas?: CanvasOptions;
  overlay?: OverlayProps;
  input?: InputProps;
  button?: ButtonProps;
  scroll?: ScrollProps;
}
