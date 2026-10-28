import type { FrameStats } from "./frame-stats";

type Measurement = Exclude<keyof FrameStats, "frame" | "fps">;
const averaged = [
  "updateTime",
  "layoutTime",
  "prepareTime",
  "paintTime",
  "diffTime",
  "contentTime",
  "renderTime",
  "debugTime",
  "presentTime",
  "intervalTime",
  "layoutNodes",
  "paintedCells",
  "contentCellsWritten",
  "cellsWritten",
] as const satisfies readonly Measurement[];
/** Publish one atomic sample at 4 Hz without introducing an animation timer. */
export class DebugSampling {
  private samples: Readonly<FrameStats>[] = [];
  private displayed?: Readonly<FrameStats>;
  private lastFrame = -1;
  private nextAt = 0;
  read(completed: Readonly<FrameStats>, now: number): Readonly<FrameStats> {
    if (completed.frame !== this.lastFrame) {
      this.samples.push(completed);
      this.lastFrame = completed.frame;
    }
    if (!this.displayed || (now >= this.nextAt && this.samples.length)) {
      const sample = { ...completed };
      for (const key of averaged) sample[key] = this.mean(key);
      sample.encodeTime = this.optionalMean("encodeTime");
      sample.writeTime = this.optionalMean("writeTime");
      sample.outputBytes = this.optionalMean("outputBytes");
      this.displayed = sample;
      this.samples = [];
      this.nextAt = now + 250;
    }
    return this.displayed;
  }
  private optionalMean(
    key: "encodeTime" | "writeTime" | "outputBytes",
  ): number | undefined {
    return this.samples.some((sample) => sample[key] === undefined)
      ? undefined
      : this.mean(key);
  }
  private mean(key: Measurement): number {
    const values = this.samples.map((sample) => sample[key]);
    return (
      values.reduce<number>((sum, value) => sum + (value ?? 0), 0) /
      values.length
    );
  }
}
