import type { ScrollProps } from "../element/props";

export interface ScrollState {
  offset: number;
  maxOffset: number;
  offsetX: number;
  maxOffsetX: number;
  scrollPlacement: { x: number; y: number };
  initialized: boolean;
}

/** Default offsets seed a scroll region once, independently of component render dirtiness. */
export function resolveScrollOffset(
  state: ScrollState,
  props?: ScrollProps,
): void {
  const vertical = props?.axis !== "horizontal";
  const raw =
    props?.offset ?? (!state.initialized ? props?.defaultOffset : undefined);
  const desiredY = typeof raw === "number" ? raw : raw?.y;
  const desiredX =
    typeof raw === "number" && !vertical
      ? raw
      : typeof raw === "object"
        ? raw.x
        : undefined;
  state.offset = Math.max(
    0,
    Math.min(state.maxOffset, desiredY ?? state.offset),
  );
  state.offsetX = Math.max(
    0,
    Math.min(state.maxOffsetX, desiredX ?? state.offsetX),
  );
  state.initialized = true;
}
