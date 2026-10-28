import type { Style } from "../style/types";

export interface DrawingContext {
  readonly width: number;
  readonly height: number;
  write(x: number, y: number, text: string, style?: Readonly<Style>): void;
  fill(
    rect: { x: number; y: number; width: number; height: number },
    style?: Readonly<Style>,
  ): void;
}
