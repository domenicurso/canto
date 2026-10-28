import type { Rect } from "../runtime/tree";
import type { Child } from "./node";

export interface OverlayProps {
  content: Child;
  modal?: boolean;
  focus?: "first" | "none";
  anchor?: () => Readonly<Rect> | undefined;
  placement?:
    | "center"
    | "bottom-start"
    | "bottom-end"
    | "top-start"
    | "top-end";
  offset?: number;
  onDismiss?: () => void;
  dismissOnEscape?: boolean;
  dismissOnOutside?: boolean;
}
