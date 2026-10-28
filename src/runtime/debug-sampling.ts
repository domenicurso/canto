import type { ContentFrameStats, FrameStats } from "./frame-stats";

export interface DebugReadings {
  fps: number;
  content: Readonly<ContentFrameStats>;
  completed: Readonly<FrameStats>;
}
/** Sparse frames publish immediately; fast streams retain actual activity and latency peaks. */
export class DebugSampling {
  private displayed?: DebugReadings;
  private pending?: DebugReadings;
  private nextAt = 0;
  read(
    content: Readonly<ContentFrameStats>,
    completed: Readonly<FrameStats>,
    now: number,
  ): DebugReadings {
    const pending = this.pending;
    if (content.fps < 8 || !pending)
      this.pending = { fps: content.fps, content, completed };
    else {
      const busier =
        content.contentCellsWritten > pending.content.contentCellsWritten ||
        (content.contentCellsWritten === pending.content.contentCellsWritten &&
          content.contentTime >= pending.content.contentTime);
      this.pending = {
        fps: content.fps,
        content: busier ? content : pending.content,
        completed:
          completed.renderTime >= pending.completed.renderTime
            ? completed
            : pending.completed,
      };
    }
    if (this.displayed && content.fps >= 8 && now < this.nextAt)
      return this.displayed;
    this.displayed = this.pending;
    this.pending = undefined;
    this.nextAt = now + 250;
    return this.displayed;
  }
}
