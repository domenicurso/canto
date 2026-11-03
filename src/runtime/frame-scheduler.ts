interface FrameWork {
  active(): boolean;
  prepare(): void;
  render(): Promise<void>;
  fail(error: unknown): void;
}

/** Owns coalescing and output backpressure, including requests made during a commit. */
export class FrameScheduler {
  private pending = false;
  private preparing = false;
  private queued = false;
  rendering: Promise<void> | undefined;
  constructor(private readonly work: FrameWork) {}
  schedule(): void {
    if (!this.work.active() || this.preparing) return;
    this.pending = true;
    if (this.queued || this.rendering) return;
    this.queued = true;
    queueMicrotask(() => {
      this.queued = false;
      void this.flush().catch((error) => this.work.fail(error));
    });
  }
  async flush(): Promise<void> {
    if (this.rendering) {
      await this.rendering;
      return;
    }
    if (!this.work.active()) return;
    this.preparing = true;
    try {
      this.work.prepare();
    } finally {
      this.preparing = false;
    }
    this.pending = false;
    this.rendering = this.work.render();
    try {
      await this.rendering;
    } finally {
      this.rendering = undefined;
      if (this.pending) this.schedule();
    }
  }
}
