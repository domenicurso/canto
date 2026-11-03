export interface CellSize {
  readonly width: number;
  readonly height: number;
}
export interface PixelReport extends CellSize {
  readonly kind: "cell" | "area";
}
export function parsePixelReport(token: string): PixelReport | undefined {
  const match = /^([46]);(\d+);(\d+)t$/.exec(token);
  if (!match) return;
  const height = Number(match[2]);
  const width = Number(match[3]);
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  )
    return;
  return { kind: match[1] === "6" ? "cell" : "area", width, height };
}
export class CellMetrics {
  private cell: CellSize | undefined;
  private area: CellSize | undefined;
  report(report: PixelReport): void {
    if (report.kind === "cell") this.cell = report;
    else this.area = report;
  }
  invalidate(): void {
    this.cell = undefined;
    this.area = undefined;
  }
  size(columns: number, rows: number): CellSize {
    // Some terminals ignore pixel queries; retain a conventional 1:2 aspect in that case.
    return (
      this.cell ??
      (this.area
        ? { width: this.area.width / columns, height: this.area.height / rows }
        : { width: 8, height: 16 })
    );
  }
}
