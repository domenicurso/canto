import type { Style } from "../style/types";
import type { PixelBuffer } from "./pixels";

export interface DrawingContext {
  readonly width: number;
  readonly height: number;
  readonly pixelWidth: number;
  readonly pixelHeight: number;
  pixels(buffer: PixelBuffer): void;
  write(x: number, y: number, text: string, style?: Readonly<Style>): void;
  fill(
    rect: { x: number; y: number; width: number; height: number },
    style?: Readonly<Style>,
  ): void;
}
