export interface PixelBuffer {
  readonly width: number;
  readonly height: number;
  /** Borrowed row-major RGBA bytes. Replace the buffer description when pixels change. */
  readonly data: Uint8Array | Uint8ClampedArray;
}
export interface CanvasOptions {
  fit?: "contain" | "cover" | "fill";
  renderer?: "auto" | "kitty" | "sixel" | "quadrants";
}
export function validatePixels(buffer: PixelBuffer): void {
  if (
    !Number.isSafeInteger(buffer.width) ||
    !Number.isSafeInteger(buffer.height) ||
    buffer.width <= 0 ||
    buffer.height <= 0 ||
    !Number.isSafeInteger(buffer.width * buffer.height * 4) ||
    buffer.data.length !== buffer.width * buffer.height * 4
  )
    throw new Error(
      "Canvas pixels require positive integer dimensions and exactly width × height × 4 RGBA bytes.",
    );
}
