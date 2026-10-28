import type { ColorTheme, RGB } from "../style/colors";

export type ThemeReport = {
  target: "foreground" | "background" | number;
  color: RGB;
};
export const themeQuery =
  "\x1b]10;?\x1b\\\x1b]11;?\x1b\\" +
  Array.from({ length: 16 }, (_, index) => `\x1b]4;${index};?\x1b\\`).join("");
function parseColor(value: string): RGB | undefined {
  const match = /^rgb:([a-f\d]{1,4})\/([a-f\d]{1,4})\/([a-f\d]{1,4})$/i.exec(
    value,
  );
  if (!match) return undefined;
  const channel = (index: number): number => {
    const hex = match[index] ?? "0";
    return Math.round((parseInt(hex, 16) * 255) / (16 ** hex.length - 1));
  };
  return [channel(1), channel(2), channel(3)];
}
/** OSC replies may be split across reads and terminated by BEL or ST. */
export function themeResponse(
  buffer: string,
): { length: number; reports: ThemeReport[] } | undefined {
  if (!buffer.startsWith("\x1b]")) return undefined;
  const end = /\x07|\x1b\\/.exec(buffer);
  if (!end) return { length: 0, reports: [] };
  const fields = buffer.slice(2, end.index).split(";");
  const command = fields.shift();
  const reports: ThemeReport[] = [];
  if (command === "4") {
    for (let i = 0; i < fields.length; i += 2) {
      const target = Number(fields[i]),
        color = parseColor(fields[i + 1] ?? "");
      if (/^\d+$/.test(fields[i] ?? "") && target >= 0 && target < 16 && color)
        reports.push({ target, color });
    }
  } else if (command === "10" || command === "11") {
    for (let i = 0; i < fields.length && Number(command) + i <= 11; i++) {
      const color = parseColor(fields[i] ?? "");
      if (color)
        reports.push({
          target: Number(command) + i === 10 ? "foreground" : "background",
          color,
        });
    }
  }
  return { length: end.index + end[0].length, reports };
}
export class TerminalColors {
  theme: ColorTheme = {};
  report(report: ThemeReport): boolean {
    const { target, color } = report;
    const previous =
      typeof target === "number"
        ? this.theme.palette?.[target]
        : this.theme[target];
    if (previous?.every((channel, index) => channel === color[index]))
      return false;
    this.theme =
      typeof target === "number"
        ? { ...this.theme, palette: { ...this.theme.palette, [target]: color } }
        : { ...this.theme, [target]: color };
    return true;
  }
}
