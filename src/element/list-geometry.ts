/** Prefix positions keep variable row lookup logarithmic without mounting the dataset. */
export class ListGeometry {
  private readonly positions: number[] = [0];
  private readonly fixed: number | undefined;
  readonly total: number;
  constructor(
    readonly count: number,
    height: number | ((index: number) => number),
  ) {
    if (typeof height === "number") {
      this.validate(height);
      this.fixed = height;
      this.total = count * height;
    } else {
      for (let index = 0; index < count; index++) {
        const value = height(index);
        this.validate(value);
        this.positions.push(this.start(index) + value);
      }
      this.total = this.start(count);
    }
    if (!Number.isSafeInteger(this.total))
      throw new Error(
        "Virtual list content exceeds safe integer cell positions.",
      );
  }
  start(index: number): number {
    return this.fixed === undefined
      ? (this.positions[index] ?? 0)
      : index * this.fixed;
  }
  height(index: number): number {
    return this.start(index + 1) - this.start(index);
  }
  indexAt(offset: number): number {
    if (this.fixed !== undefined)
      return Math.max(0, Math.min(this.count, Math.floor(offset / this.fixed)));
    let low = 0;
    let high = this.count;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (this.start(middle + 1) <= offset) low = middle + 1;
      else high = middle;
    }
    return low;
  }
  reveal(index: number, offset: number, height: number): number {
    const top = this.start(index);
    const bottom = this.start(index + 1);
    const desired =
      top < offset || bottom - top > height
        ? top
        : Math.max(offset, bottom - height);
    return Math.max(0, Math.min(this.total - height, desired));
  }
  private validate(height: number): void {
    if (!Number.isSafeInteger(height) || height < 1)
      throw new Error(
        "A virtual list requires positive integer itemHeight values.",
      );
  }
}
