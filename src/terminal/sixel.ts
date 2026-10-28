import type { PixelBuffer } from "../element/pixels";

export function sixel(buffer: PixelBuffer): string {
  const palette = new Set<number>();
  const pixels = new Uint8Array(buffer.width * buffer.height);
  for (let index = 0; index < pixels.length; index++) {
    const at = index * 4;
    const color =
      Math.round((buffer.data[at] ?? 0) / 51) * 36 +
      Math.round((buffer.data[at + 1] ?? 0) / 51) * 6 +
      Math.round((buffer.data[at + 2] ?? 0) / 51);
    pixels[index] = color;
    palette.add(color);
  }
  let output = `\x1bP0;1;0q"1;1;${buffer.width};${buffer.height}`;
  for (const color of palette)
    output += `#${color};2;${Math.floor(color / 36) * 20};${(Math.floor(color / 6) % 6) * 20};${(color % 6) * 20}`;
  for (let y = 0; y < buffer.height; y += 6) {
    const colors = new Set(
      pixels.subarray(
        y * buffer.width,
        Math.min(buffer.height, y + 6) * buffer.width,
      ),
    );
    for (const color of colors)
      output +=
        `#${color}` +
        band(pixels, { width: buffer.width, height: buffer.height, y }, color) +
        "$";
    if (y + 6 < buffer.height) output += "-";
  }
  return output + "\x1b\\";
}
function band(
  pixels: Uint8Array,
  area: { width: number; height: number; y: number },
  color: number,
): string {
  let output = "",
    previous = "",
    count = 0;
  for (let x = 0; x < area.width; x++) {
    let mask = 0;
    for (let dy = 0; dy < 6 && area.y + dy < area.height; dy++)
      if (pixels[(area.y + dy) * area.width + x] === color) mask |= 1 << dy;
    const char = String.fromCharCode(63 + mask);
    if (char === previous) count++;
    else {
      output += repeat(previous, count);
      previous = char;
      count = 1;
    }
  }
  return output + repeat(previous, count);
}
function repeat(char: string, count: number): string {
  return count > 3 ? `!${count}${char}` : char.repeat(count);
}
