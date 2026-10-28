/** Counts successful presentations over the last second without scheduling redraws. */
export class FrameRate {
  private presented: number[] = [];
  rate(now: number): number {
    this.presented = this.presented.filter((time) => now - time < 1000);
    return this.presented.length;
  }
  record(now: number): void {
    this.presented.push(now);
  }
}
