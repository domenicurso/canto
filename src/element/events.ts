export interface KeyEvent {
  readonly key: string;
  readonly text?: string;
  readonly ctrl: boolean;
  readonly alt: boolean;
  readonly shift: boolean;
  readonly meta?: boolean;
  readonly defaultPrevented: boolean;
  readonly propagationStopped: boolean;
  preventDefault(): void;
  stopPropagation(): void;
}
export interface PointerEvent {
  readonly x: number;
  readonly y: number;
  readonly action: "press" | "release" | "move" | "scroll";
  readonly button: number;
  readonly deltaY: number;
  readonly deltaX?: number;
  readonly deltaMode?: "cell" | "pixel";
  readonly shift?: boolean;
  readonly alt?: boolean;
  readonly ctrl?: boolean;
  readonly clicks?: 1 | 2 | 3;
}
export interface ElementRef {
  focus(): void;
  scrollTo(offset: number | { x: number; y: number }): void;
  readonly rect: { x: number; y: number; width: number; height: number };
}
export interface ElementEvents {
  onKey?: (event: KeyEvent) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onMouse?: (event: PointerEvent) => void;
  ref?: (element: ElementRef | null) => void;
  focusable?: boolean;
  tabIndex?: number;
  autoFocus?: boolean;
}
