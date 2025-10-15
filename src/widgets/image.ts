import { readFileSync, readSync, statSync } from "node:fs";
import { inflateSync } from "node:zlib";

import { BaseNode } from "./node";
import { resolveAxisSize } from "./style-utils";

import type { Constraints } from "../layout";
import type { Signal } from "../signals";
import type { ResolvedStyle } from "../style";
import type { Color } from "../style/types";
import type { PaintResult, Point, Size } from "../types";
import type { Node } from "./node";
import type { ImageProps } from "./props";

type Rgb = [number, number, number];
type Rgba = [number, number, number, number];

interface DecodedImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

interface CellGlyph {
  char: string;
  foreground: Rgb | null;
  background: Rgb | null;
}

interface RasterizedImage {
  width: number;
  height: number;
  cells: CellGlyph[][];
}

interface RasterCache {
  key: string;
  width: number;
  height: number;
  cells: CellGlyph[][];
}

const PNG_SIGNATURE = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10);

const QUADRANT_CHAR_MAP: Record<number, string> = {
  0b0000: " ",
  0b0001: "▘",
  0b0010: "▝",
  0b0011: "▀",
  0b0100: "▖",
  0b0101: "▌",
  0b0110: "▞",
  0b0111: "▛",
  0b1000: "▗",
  0b1001: "▚",
  0b1010: "▐",
  0b1011: "▜",
  0b1100: "▄",
  0b1101: "▙",
  0b1110: "▟",
  0b1111: "█",
};

const NAMED_COLOR_TO_RGB: Record<string, Rgb> = {
  black: [0, 0, 0],
  red: [205, 0, 0],
  green: [0, 205, 0],
  yellow: [205, 205, 0],
  blue: [0, 0, 238],
  magenta: [205, 0, 205],
  cyan: [0, 205, 205],
  white: [229, 229, 229],
  brightBlack: [127, 127, 127],
  brightRed: [255, 0, 0],
  brightGreen: [0, 255, 0],
  brightYellow: [255, 255, 0],
  brightBlue: [92, 92, 255],
  brightMagenta: [255, 0, 255],
  brightCyan: [0, 255, 255],
  brightWhite: [255, 255, 255],
};

const DEFAULT_CELL_ASPECT_RATIO = 0.5;
let cachedCellAspectRatio: number | null = null;
let attemptedAspectDetection = false;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseEnvCellAspect(): number | null {
  if (typeof process === "undefined" || !process?.env) {
    return null;
  }
  const raw = process.env.CANTO_CELL_ASPECT_RATIO;
  if (!raw) {
    return null;
  }
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return null;
}

function queryCellPixelSize(): { width: number; height: number } | null {
  if (typeof process === "undefined") {
    return null;
  }
  const stdin: typeof process.stdin | undefined = process.stdin;
  const stdout: typeof process.stdout | undefined = process.stdout;
  if (
    !stdin ||
    !stdout ||
    typeof stdin.setRawMode !== "function" ||
    !stdin.isTTY ||
    !stdout.isTTY
  ) {
    return null;
  }

  const buffer = Buffer.alloc(1);
  let response = "";
  const wasRaw = Boolean(stdin.isRaw);

  try {
    if (!wasRaw) {
      stdin.setRawMode(true);
    }

    stdout.write("\x1b[16t");

    while (true) {
      const bytesRead = readSync(stdin.fd, buffer, 0, 1, null);
      if (bytesRead <= 0) {
        continue;
      }
      response += buffer.toString("utf8", 0, bytesRead);
      if (response.endsWith("t")) {
        break;
      }
    }
  } catch {
    return null;
  } finally {
    if (!wasRaw) {
      try {
        stdin.setRawMode(false);
      } catch {
        // ignore restore errors
      }
    }
  }

  const match = response.match(/\x1b\[\d*;(\d+);(\d+)t/);
  if (!match) {
    return null;
  }

  const heightPx = Number.parseInt(match[1] ?? "", 10);
  const widthPx = Number.parseInt(match[2] ?? "", 10);
  if (
    Number.isFinite(heightPx) &&
    Number.isFinite(widthPx) &&
    heightPx > 0 &&
    widthPx > 0
  ) {
    return { width: widthPx, height: heightPx };
  }
  return null;
}

function detectCellAspectRatio(): number {
  if (cachedCellAspectRatio !== null) {
    return cachedCellAspectRatio;
  }

  const envValue = parseEnvCellAspect();
  if (envValue !== null) {
    cachedCellAspectRatio = envValue;
    return envValue;
  }

  if (!attemptedAspectDetection) {
    attemptedAspectDetection = true;
    const metrics = queryCellPixelSize();
    if (metrics) {
      const ratio = metrics.width / metrics.height;
      if (Number.isFinite(ratio) && ratio > 0) {
        cachedCellAspectRatio = ratio;
        return ratio;
      }
    }
  }

  cachedCellAspectRatio = DEFAULT_CELL_ASPECT_RATIO;
  return cachedCellAspectRatio;
}

function toRgb(color: Color | null | undefined): Rgb | null {
  if (color === null || color === undefined) {
    return null;
  }
  if (Array.isArray(color)) {
    return [
      clamp(Math.round(color[0]), 0, 255),
      clamp(Math.round(color[1]), 0, 255),
      clamp(Math.round(color[2]), 0, 255),
    ];
  }
  if (typeof color === "string") {
    if (color.startsWith("#")) {
      const hex = color.slice(1);
      if (hex.length === 3) {
        const rChar = hex.charAt(0);
        const gChar = hex.charAt(1);
        const bChar = hex.charAt(2);
        if (!rChar || !gChar || !bChar) {
          return null;
        }
        const r = parseInt(rChar + rChar, 16);
        const g = parseInt(gChar + gChar, 16);
        const b = parseInt(bChar + bChar, 16);
        return [r, g, b];
      }
      if (hex.length === 6) {
        const rHex = hex.slice(0, 2);
        const gHex = hex.slice(2, 4);
        const bHex = hex.slice(4, 6);
        if (!rHex || !gHex || !bHex) {
          return null;
        }
        const r = parseInt(rHex, 16);
        const g = parseInt(gHex, 16);
        const b = parseInt(bHex, 16);
        return [r, g, b];
      }
      return null;
    }
    if (NAMED_COLOR_TO_RGB[color]) {
      return NAMED_COLOR_TO_RGB[color];
    }
  }
  return null;
}

function readUint32BE(buffer: Uint8Array, offset: number): number {
  if (offset + 4 > buffer.length) {
    throw new Error("PNG chunk is truncated.");
  }
  const view = new DataView(buffer.buffer, buffer.byteOffset + offset, 4);
  return view.getUint32(0);
}

function verifySignature(buffer: Uint8Array): void {
  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (buffer[i] !== PNG_SIGNATURE[i]) {
      throw new Error(
        "Unsupported image format. Only PNG is currently supported.",
      );
    }
  }
}

function byteAt(array: Uint8Array, index: number): number {
  if (index < 0 || index >= array.length) {
    return 0;
  }
  return array[index]!;
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) {
    return a;
  }
  if (pb <= pc) {
    return b;
  }
  return c;
}

function applyFilter(
  filter: number,
  line: Uint8Array,
  prevLine: Uint8Array | null,
  bytesPerPixel: number,
): void {
  switch (filter) {
    case 0:
      return;
    case 1: {
      for (let i = 0; i < line.length; i++) {
        const left = i >= bytesPerPixel ? byteAt(line, i - bytesPerPixel) : 0;
        line[i] = (byteAt(line, i) + left) & 0xff;
      }
      return;
    }
    case 2: {
      for (let i = 0; i < line.length; i++) {
        const up = prevLine ? byteAt(prevLine, i) : 0;
        line[i] = (byteAt(line, i) + up) & 0xff;
      }
      return;
    }
    case 3: {
      for (let i = 0; i < line.length; i++) {
        const left = i >= bytesPerPixel ? byteAt(line, i - bytesPerPixel) : 0;
        const up = prevLine ? byteAt(prevLine, i) : 0;
        line[i] = (byteAt(line, i) + Math.floor((left + up) / 2)) & 0xff;
      }
      return;
    }
    case 4: {
      for (let i = 0; i < line.length; i++) {
        const left = i >= bytesPerPixel ? byteAt(line, i - bytesPerPixel) : 0;
        const up = prevLine ? byteAt(prevLine, i) : 0;
        const upLeft =
          prevLine && i >= bytesPerPixel
            ? byteAt(prevLine, i - bytesPerPixel)
            : 0;
        line[i] = (byteAt(line, i) + paethPredictor(left, up, upLeft)) & 0xff;
      }
      return;
    }
    default:
      throw new Error(`Unsupported PNG filter method: ${filter}`);
  }
}

function decodePng(buffer: Uint8Array): DecodedImage {
  verifySignature(buffer);

  let offset = PNG_SIGNATURE.length;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let palette: Uint8Array | null = null;
  let paletteAlpha: Uint8Array | null = null;
  const idatChunks: Uint8Array[] = [];

  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) {
      throw new Error("PNG chunk header truncated.");
    }
    const length = readUint32BE(buffer, offset);
    offset += 4;
    if (offset + 4 > buffer.length) {
      throw new Error("PNG chunk type truncated.");
    }
    const type = String.fromCharCode(
      byteAt(buffer, offset),
      byteAt(buffer, offset + 1),
      byteAt(buffer, offset + 2),
      byteAt(buffer, offset + 3),
    );
    offset += 4;

    if (offset + length > buffer.length) {
      throw new Error(`PNG chunk ${type} is truncated.`);
    }
    const data = buffer.subarray(offset, offset + length);
    offset += length;

    if (offset + 4 > buffer.length) {
      throw new Error(`PNG chunk ${type} missing CRC.`);
    }
    offset += 4; // Skip CRC

    if (type === "IHDR") {
      if (data.length < 13) {
        throw new Error("PNG IHDR chunk is malformed.");
      }
      const ihdrView = new DataView(
        data.buffer,
        data.byteOffset,
        data.byteLength,
      );
      width = ihdrView.getUint32(0);
      height = ihdrView.getUint32(4);
      bitDepth = ihdrView.getUint8(8);
      colorType = ihdrView.getUint8(9);
      const isIndexed = colorType === 3;
      if (bitDepth !== 8 && !(isIndexed && bitDepth === 8)) {
        throw new Error(
          `Unsupported bit depth ${bitDepth}. Only 8-bit PNGs are supported.`,
        );
      }
      if (
        colorType !== 2 &&
        colorType !== 6 &&
        colorType !== 0 &&
        colorType !== 3
      ) {
        throw new Error(
          `Unsupported PNG color type ${colorType}. Only grayscale, RGB, RGBA, and indexed PNGs are supported.`,
        );
      }
    } else if (type === "PLTE") {
      if (data.length % 3 !== 0) {
        throw new Error("PNG palette chunk length must be divisible by 3.");
      }
      palette = data.slice();
    } else if (type === "tRNS") {
      paletteAlpha = data.slice();
    } else if (type === "IDAT") {
      idatChunks.push(data.slice());
    } else if (type === "IEND") {
      break;
    }
  }

  if (!width || !height) {
    throw new Error("PNG image is missing header information.");
  }
  if (colorType === 3 && !palette) {
    throw new Error("Indexed PNG missing palette.");
  }

  const compressedLength = idatChunks.reduce(
    (sum, chunk) => sum + chunk.length,
    0,
  );
  const compressedData = new Uint8Array(compressedLength);
  let compressedOffset = 0;
  for (const chunk of idatChunks) {
    compressedData.set(chunk, compressedOffset);
    compressedOffset += chunk.length;
  }

  const decompressed = inflateSync(compressedData);
  const samplesPerPixel =
    colorType === 6
      ? 4
      : colorType === 2
        ? 3
        : colorType === 0 || colorType === 3
          ? 1
          : 0;
  const bytesPerPixel = Math.max(
    1,
    Math.ceil((bitDepth * samplesPerPixel) / 8),
  );

  if (bytesPerPixel === 0) {
    throw new Error(`Unsupported PNG color type ${colorType}.`);
  }

  const stride = width * bytesPerPixel;
  const expectedLength = height * (stride + 1);
  if (decompressed.length < expectedLength) {
    throw new Error("PNG data ended unexpectedly while decoding.");
  }

  const raw = new Uint8Array(width * height * bytesPerPixel);
  let rawOffset = 0;
  let inputOffset = 0;
  let prevLine: Uint8Array | null = null;

  for (let row = 0; row < height; row++) {
    if (inputOffset >= decompressed.length) {
      throw new Error("PNG data ended unexpectedly while decoding.");
    }
    const filterType = byteAt(decompressed, inputOffset);
    inputOffset += 1;
    if (inputOffset + stride > decompressed.length) {
      throw new Error("PNG data ended unexpectedly while decoding.");
    }
    const line = decompressed
      .subarray(inputOffset, inputOffset + stride)
      .slice();
    inputOffset += stride;
    applyFilter(filterType, line, prevLine, bytesPerPixel);
    raw.set(line, rawOffset);
    rawOffset += stride;
    prevLine = line;
  }

  const pixelCount = width * height;
  const rgba = new Uint8ClampedArray(pixelCount * 4);

  if (colorType === 6) {
    rgba.set(raw);
  } else if (colorType === 2) {
    for (let i = 0; i < pixelCount; i++) {
      const src = i * 3;
      const dest = i * 4;
      rgba[dest] = raw[src]!;
      rgba[dest + 1] = raw[src + 1]!;
      rgba[dest + 2] = raw[src + 2]!;
      rgba[dest + 3] = 255;
    }
  } else if (colorType === 3) {
    const paletteData = palette!;
    const paletteEntries = paletteData.length / 3;
    for (let i = 0; i < pixelCount; i++) {
      const index = raw[i]!;
      if (index >= paletteEntries) {
        throw new Error("Indexed PNG pixel references missing palette entry.");
      }
      const paletteOffset = index * 3;
      const dest = i * 4;
      rgba[dest] = paletteData[paletteOffset] ?? 0;
      rgba[dest + 1] = paletteData[paletteOffset + 1] ?? 0;
      rgba[dest + 2] = paletteData[paletteOffset + 2] ?? 0;
      if (paletteAlpha && index < paletteAlpha.length) {
        rgba[dest + 3] = paletteAlpha[index] ?? 255;
      } else {
        rgba[dest + 3] = 255;
      }
    }
  } else {
    for (let i = 0; i < pixelCount; i++) {
      const value = raw[i]!;
      const dest = i * 4;
      rgba[dest] = value;
      rgba[dest + 1] = value;
      rgba[dest + 2] = value;
      rgba[dest + 3] = 255;
    }
  }

  return { width, height, data: rgba };
}

function hasAlpha(pixels: Rgba[], mask: number): number {
  let total = 0;
  for (let index = 0; index < 4; index++) {
    if ((mask >> index) & 1) {
      const pixel = pixels[index];
      if (!pixel) {
        continue;
      }
      total += pixel[3] / 255;
    }
  }
  return total;
}

function computeAverageColor(
  pixels: Rgba[],
  mask: number,
): { color: Rgb | null; weight: number } {
  let weight = 0;
  let r = 0;
  let g = 0;
  let b = 0;
  for (let index = 0; index < 4; index++) {
    if ((mask >> index) & 1) {
      const pixel = pixels[index];
      if (!pixel) {
        continue;
      }
      const alphaWeight = pixel[3] / 255;
      if (alphaWeight <= 0) {
        continue;
      }
      weight += alphaWeight;
      r += pixel[0] * alphaWeight;
      g += pixel[1] * alphaWeight;
      b += pixel[2] * alphaWeight;
    }
  }
  if (weight <= 0) {
    return { color: null, weight: 0 };
  }
  return { color: [r / weight, g / weight, b / weight], weight };
}

function colorError(pixels: Rgba[], mask: number, color: Rgb): number {
  let error = 0;
  for (let index = 0; index < 4; index++) {
    if ((mask >> index) & 1) {
      const pixel = pixels[index];
      if (!pixel) {
        continue;
      }
      const weight = pixel[3] / 255;
      if (weight <= 0) {
        continue;
      }
      const dr = pixel[0] - color[0];
      const dg = pixel[1] - color[1];
      const db = pixel[2] - color[2];
      error += weight * (dr * dr + dg * dg + db * db);
    }
  }
  return error;
}

function normalizeRgb(color: Rgb | null): Rgb | null {
  if (!color) {
    return null;
  }
  return [
    clamp(Math.round(color[0]), 0, 255),
    clamp(Math.round(color[1]), 0, 255),
    clamp(Math.round(color[2]), 0, 255),
  ];
}

function chooseBestMask(
  pixels: Rgba[],
  defaultBackground: Rgb | null,
): CellGlyph {
  let bestMask = 0;
  let bestError = Number.POSITIVE_INFINITY;
  let bestForeground: Rgb | null = null;
  let bestBackground: Rgb | null = null;

  for (let mask = 0; mask < 16; mask++) {
    const fgState = computeAverageColor(pixels, mask);
    const bgMask = ~mask & 0b1111;
    const bgState = computeAverageColor(pixels, bgMask);
    const fgAlpha = hasAlpha(pixels, mask);
    const bgAlpha = hasAlpha(pixels, bgMask);

    const fgColor = fgState.weight > 0 ? fgState.color : null;
    const bgColor =
      bgState.weight > 0
        ? bgState.color
        : bgAlpha > 0
          ? defaultBackground
          : defaultBackground;

    if (fgAlpha > 0 && !fgColor) {
      continue;
    }
    if (bgAlpha > 0 && !bgColor) {
      continue;
    }

    let error = 0;
    if (fgColor) {
      error += colorError(pixels, mask, fgColor);
    } else if (fgAlpha > 0) {
      error += fgAlpha * 1_000_000;
    }
    if (bgColor) {
      error += colorError(pixels, bgMask, bgColor);
    } else if (bgAlpha > 0) {
      error += bgAlpha * 1_000_000;
    }

    if (error < bestError) {
      bestError = error;
      bestMask = mask;
      bestForeground = fgColor;
      bestBackground = bgAlpha > 0 ? bgColor : defaultBackground;
    }
  }

  const char = QUADRANT_CHAR_MAP[bestMask] ?? " ";
  return {
    char,
    foreground: normalizeRgb(bestForeground),
    background: normalizeRgb(bestBackground),
  };
}

function samplePixel(image: DecodedImage, x: number, y: number): Rgba {
  const clampedX = clamp(Math.floor(x), 0, image.width - 1);
  const clampedY = clamp(Math.floor(y), 0, image.height - 1);
  const index = (clampedY * image.width + clampedX) * 4;
  const data = image.data;
  return [
    data[index] ?? 0,
    data[index + 1] ?? 0,
    data[index + 2] ?? 0,
    data[index + 3] ?? 0,
  ];
}

function rasterizeToQuadrants(
  image: DecodedImage,
  outputWidth: number,
  outputHeight: number,
  defaultBackground: Rgb | null,
): RasterizedImage {
  if (outputWidth <= 0 || outputHeight <= 0) {
    return { width: outputWidth, height: outputHeight, cells: [] };
  }

  const cells: CellGlyph[][] = [];
  const subWidth = outputWidth * 2;
  const subHeight = outputHeight * 2;
  const pixelWidth = image.width;
  const pixelHeight = image.height;

  for (let cellY = 0; cellY < outputHeight; cellY++) {
    const row: CellGlyph[] = [];
    for (let cellX = 0; cellX < outputWidth; cellX++) {
      const pixels: Rgba[] = [];
      const baseSubX = cellX * 2;
      const baseSubY = cellY * 2;

      for (let offsetY = 0; offsetY < 2; offsetY++) {
        for (let offsetX = 0; offsetX < 2; offsetX++) {
          const subX = baseSubX + offsetX + 0.5;
          const subY = baseSubY + offsetY + 0.5;
          const sampleX = (subX * pixelWidth) / subWidth;
          const sampleY = (subY * pixelHeight) / subHeight;
          pixels.push(samplePixel(image, sampleX, sampleY));
        }
      }

      row.push(chooseBestMask(pixels, defaultBackground));
    }
    cells.push(row);
  }

  return { width: outputWidth, height: outputHeight, cells };
}

function decodeImageFromPath(path: string): DecodedImage {
  const file = readFileSync(path);
  if (file.length < PNG_SIGNATURE.length) {
    throw new Error("Image file is too small to be a valid PNG.");
  }
  return decodePng(file);
}

function createCacheKey(
  width: number,
  height: number,
  background: Rgb | null,
): string {
  const bg = background
    ? `${background[0]},${background[1]},${background[2]}`
    : "null";
  return `${width}x${height}:${bg}`;
}

export class ImageNode extends BaseNode<ImageProps> {
  private literalPath: string | null;
  private decoded: DecodedImage | null = null;
  private errorMessage: string | null = null;
  private lastLoadedPath: string | null = null;
  private lastLoadedMTime: number | null = null;
  private intrinsicWidthCells = 0;
  private intrinsicHeightCells = 0;
  private rasterCache: RasterCache | null = null;
  private renderWidth = 0;
  private renderHeight = 0;
  private renderOffsetX = 0;
  private renderOffsetY = 0;

  private resolveCellAspectRatio(): number {
    const propValue = this.readPropValue("cellAspectRatio");
    const numeric =
      typeof propValue === "number"
        ? propValue
        : typeof propValue === "string"
          ? Number(propValue)
          : Number.NaN;
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }
    return detectCellAspectRatio();
  }

  constructor(path?: string | Signal<string>) {
    super("Image", []);
    this.literalPath = typeof path === "string" ? path : null;
    if (path && typeof path !== "string") {
      this.bind(path);
    }
  }

  private resolvePath(): string | null {
    const propPath = this.readPropValue("path");
    if (typeof propPath === "string" && propPath.length > 0) {
      return propPath;
    }
    if (this.binding) {
      const boundValue = this.binding.get();
      if (boundValue) {
        return boundValue;
      }
    }
    return this.literalPath;
  }

  private loadImage(): void {
    const path = this.resolvePath();
    if (!path) {
      this.decoded = null;
      this.errorMessage = "No image path provided.";
      this.intrinsicWidthCells = 0;
      this.intrinsicHeightCells = 0;
      this.lastLoadedPath = null;
      this.lastLoadedMTime = null;
      this.rasterCache = null;
      return;
    }

    try {
      const stats = statSync(path);
      const mtime = stats.mtimeMs;
      if (
        this.decoded &&
        this.errorMessage === null &&
        this.lastLoadedPath === path &&
        this.lastLoadedMTime === mtime
      ) {
        return;
      }

      const decoded = decodeImageFromPath(path);
      this.decoded = decoded;
      this.intrinsicWidthCells = Math.ceil(decoded.width / 2);
      this.intrinsicHeightCells = Math.ceil(decoded.height / 2);
      this.errorMessage = null;
      this.lastLoadedPath = path;
      this.lastLoadedMTime = mtime;
      this.rasterCache = null;
    } catch (error) {
      this.decoded = null;
      this.intrinsicWidthCells = 0;
      this.intrinsicHeightCells = 0;
      const message =
        error instanceof Error
          ? error.message
          : "Unexpected error while loading image.";
      this.errorMessage = `Failed to load image: ${message}`;
      this.lastLoadedPath = path;
      this.lastLoadedMTime = null;
      this.rasterCache = null;
    }
  }

  private getRasterized(
    width: number,
    height: number,
    defaultBackground: Rgb | null,
  ): RasterizedImage | null {
    if (!this.decoded) {
      return null;
    }
    if (width <= 0 || height <= 0) {
      return { width, height, cells: [] };
    }
    const key = createCacheKey(width, height, defaultBackground);
    if (
      this.rasterCache &&
      this.rasterCache.key === key &&
      this.rasterCache.width === width &&
      this.rasterCache.height === height
    ) {
      return {
        width: this.rasterCache.width,
        height: this.rasterCache.height,
        cells: this.rasterCache.cells,
      };
    }

    const rasterized = rasterizeToQuadrants(
      this.decoded,
      width,
      height,
      defaultBackground,
    );
    this.rasterCache = {
      key,
      width: rasterized.width,
      height: rasterized.height,
      cells: rasterized.cells,
    };
    return rasterized;
  }

  _measure(constraints: Constraints, inherited: ResolvedStyle): Size {
    const style = this.resolveCurrentStyle(inherited);
    this.loadImage();

    const padding = style.padding;
    const horizontalPadding = padding.left + padding.right;
    const verticalPadding = padding.top + padding.bottom;

    const intrinsicContentWidth =
      this.errorMessage !== null
        ? this.errorMessage.length
        : this.intrinsicWidthCells;
    const intrinsicContentHeight =
      this.errorMessage !== null ? 1 : this.intrinsicHeightCells;

    const outerIntrinsicWidth = intrinsicContentWidth + horizontalPadding;
    const outerIntrinsicHeight = intrinsicContentHeight + verticalPadding;

    const widthToken =
      style.width === "auto" && !this.styleDefinition.width
        ? "hug"
        : style.width;
    const heightToken =
      style.height === "auto" && !this.styleDefinition.height
        ? "hug"
        : style.height;

    const resolvedOuterWidth = resolveAxisSize(
      widthToken,
      style.minWidth,
      style.maxWidth,
      outerIntrinsicWidth,
      constraints.minWidth,
      constraints.maxWidth,
    );

    const resolvedOuterHeight = resolveAxisSize(
      heightToken,
      style.minHeight,
      style.maxHeight,
      outerIntrinsicHeight,
      constraints.minHeight,
      constraints.maxHeight,
    );

    let contentWidthLimit = Math.max(0, resolvedOuterWidth - horizontalPadding);
    let contentHeightLimit = Math.max(0, resolvedOuterHeight - verticalPadding);

    if (!Number.isFinite(contentWidthLimit)) {
      contentWidthLimit = intrinsicContentWidth;
    }
    if (!Number.isFinite(contentHeightLimit)) {
      contentHeightLimit = intrinsicContentHeight;
    }

    if (this.errorMessage) {
      const textWidth = Math.min(
        contentWidthLimit,
        Math.max(0, this.errorMessage.length),
      );
      const textHeight = Math.min(contentHeightLimit, 1);
      this.renderWidth = Math.max(0, Math.floor(textWidth));
      this.renderHeight = Math.max(0, Math.floor(textHeight));
      this.renderOffsetX = 0;
      this.renderOffsetY = 0;
      const finalWidth = Math.max(
        this.renderWidth + horizontalPadding,
        constraints.minWidth,
      );
      const finalHeight = Math.max(
        this.renderHeight + verticalPadding,
        constraints.minHeight,
      );
      return {
        width: finalWidth,
        height: finalHeight,
      };
    }

    if (!this.decoded || contentWidthLimit <= 0 || contentHeightLimit <= 0) {
      this.renderWidth = 0;
      this.renderHeight = 0;
      this.renderOffsetX = 0;
      this.renderOffsetY = 0;
      const finalWidth = Math.max(horizontalPadding, constraints.minWidth);
      const finalHeight = Math.max(verticalPadding, constraints.minHeight);
      return { width: finalWidth, height: finalHeight };
    }

    const maxContentWidth =
      contentWidthLimit >= 1 ? Math.floor(contentWidthLimit) : 0;
    const maxContentHeight =
      contentHeightLimit >= 1 ? Math.floor(contentHeightLimit) : 0;

    const widthMode = widthToken;
    const heightMode = heightToken;
    const widthShrinks = widthMode === "hug" || widthMode === "auto";
    const heightShrinks = heightMode === "hug" || heightMode === "auto";

    let targetWidth = widthShrinks
      ? Math.min(maxContentWidth, this.intrinsicWidthCells)
      : maxContentWidth;
    let targetHeight = heightShrinks
      ? Math.min(maxContentHeight, this.intrinsicHeightCells)
      : maxContentHeight;

    if (widthShrinks && targetWidth <= 0 && this.intrinsicWidthCells > 0) {
      targetWidth = Math.min(
        this.intrinsicWidthCells,
        Math.max(1, maxContentWidth),
      );
    }
    if (heightShrinks && targetHeight <= 0 && this.intrinsicHeightCells > 0) {
      targetHeight = Math.min(
        this.intrinsicHeightCells,
        Math.max(1, maxContentHeight),
      );
    }

    const maintainAspect =
      widthShrinks &&
      heightShrinks &&
      this.decoded.width > 0 &&
      this.decoded.height > 0;

    if (
      maintainAspect &&
      maxContentWidth > 0 &&
      maxContentHeight > 0 &&
      this.intrinsicWidthCells > 0 &&
      this.intrinsicHeightCells > 0
    ) {
      const cellAspect = this.resolveCellAspectRatio();
      const safeCellAspect =
        Number.isFinite(cellAspect) && cellAspect > 0
          ? cellAspect
          : DEFAULT_CELL_ASPECT_RATIO;
      const intrinsicPixelAspect = this.decoded.width / this.decoded.height;
      const desiredCellAspect =
        intrinsicPixelAspect > 0 ? intrinsicPixelAspect / safeCellAspect : 1;

      let widthCandidate = Math.min(maxContentWidth, this.intrinsicWidthCells);
      widthCandidate = Math.max(1, widthCandidate);
      let heightCandidate = Math.max(
        1,
        Math.round(widthCandidate / desiredCellAspect),
      );

      if (heightCandidate > maxContentHeight) {
        heightCandidate = Math.min(maxContentHeight, this.intrinsicHeightCells);
        widthCandidate = Math.max(
          1,
          Math.round(heightCandidate * desiredCellAspect),
        );
        if (widthCandidate > maxContentWidth) {
          widthCandidate = Math.min(maxContentWidth, this.intrinsicWidthCells);
          heightCandidate = Math.max(
            1,
            Math.round(widthCandidate / desiredCellAspect),
          );
          if (heightCandidate > maxContentHeight) {
            heightCandidate = Math.min(
              maxContentHeight,
              this.intrinsicHeightCells,
            );
          }
        }
      }

      targetWidth = Math.max(
        1,
        Math.min(widthCandidate, this.intrinsicWidthCells, maxContentWidth),
      );
      targetHeight = Math.max(
        1,
        Math.min(heightCandidate, this.intrinsicHeightCells, maxContentHeight),
      );
    }

    this.renderWidth = targetWidth;
    this.renderHeight = targetHeight;
    this.renderOffsetX = Math.max(
      0,
      Math.floor((contentWidthLimit - targetWidth) / 2),
    );
    this.renderOffsetY = Math.max(
      0,
      Math.floor((contentHeightLimit - targetHeight) / 2),
    );

    const finalWidth = Math.max(
      targetWidth + horizontalPadding,
      constraints.minWidth,
    );
    const finalHeight = Math.max(
      targetHeight + verticalPadding,
      constraints.minHeight,
    );

    return { width: finalWidth, height: finalHeight };
  }

  _layout(origin: Point, size: Size): void {
    this.updateLayoutRect(origin, size);
    this.dirty = false;
  }

  _paint(): PaintResult {
    const snapshot = this.getStyleSnapshot();
    const layout = this.getLayoutRect();
    const style = this.getResolvedStyle();

    const rects: PaintResult["rects"] = [];
    const spans: PaintResult["spans"] = [];

    if (style.background !== null) {
      rects.push({
        x: layout.x,
        y: layout.y,
        width: layout.width,
        height: layout.height,
        style: snapshot,
      });
    }

    const contentWidth = Math.max(0, Math.floor(this.contentRect.width));
    const contentHeight = Math.max(0, Math.floor(this.contentRect.height));
    const targetWidth = Math.min(this.renderWidth, contentWidth);
    const targetHeight = Math.min(this.renderHeight, contentHeight);
    const originX =
      this.contentRect.x +
      Math.min(this.renderOffsetX, Math.max(0, contentWidth - targetWidth));
    const originY =
      this.contentRect.y +
      Math.min(this.renderOffsetY, Math.max(0, contentHeight - targetHeight));

    if (this.errorMessage) {
      if (targetWidth > 0) {
        const text = this.errorMessage.slice(0, targetWidth);
        spans.push({
          x: originX,
          y: originY,
          text,
          style: snapshot,
        });
      }
      return { spans, rects };
    }

    if (!this.decoded || targetWidth <= 0 || targetHeight <= 0) {
      return { spans, rects };
    }

    const defaultBackground = toRgb(style.background ?? null);
    const rasterized = this.getRasterized(
      targetWidth,
      targetHeight,
      defaultBackground,
    );
    if (!rasterized) {
      return { spans, rects };
    }

    for (let y = 0; y < rasterized.height; y++) {
      const row = rasterized.cells[y];
      if (!row) {
        continue;
      }
      for (let x = 0; x < rasterized.width; x++) {
        const glyph = row[x];
        if (!glyph) {
          continue;
        }

        const cellStyle = {
          foreground: glyph.foreground ?? snapshot.foreground,
          background: glyph.background ?? snapshot.background,
          bold: snapshot.bold,
          italic: snapshot.italic,
          underline: snapshot.underline,
          faint: snapshot.faint,
        };

        spans.push({
          x: originX + x,
          y: originY + y,
          text: glyph.char,
          style: cellStyle,
        });
      }
    }

    return { spans, rects };
  }
}

export function Image(path?: string | Signal<string>): Node {
  return new ImageNode(path);
}
