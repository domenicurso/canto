import { Element } from "../element/node";
import { ProcessTerminal } from "../terminal/process";
import { Frames } from "./frame";
import { commitEffects } from "./hooks";
import { InputRouter } from "./input";
import { reconcile, unmount } from "./reconcile";
import { Refs } from "./refs";
import { mounted } from "./tree";

import type { Child } from "../element/node";
import type { TerminalEvent } from "../terminal/events";
import type { Mode, Terminal } from "../terminal/transport";

export interface AppOptions {
  mode?: Mode;
  terminal?: Terminal;
  signal?: AbortSignal;
  exitOnCtrlC?: boolean;
}
export type AppStatus = "created" | "starting" | "running" | "stopping" | "stopped";
export class App {
  private state: AppStatus = "created";
  private readonly terminal: Terminal;
  private readonly root;
  private readonly frames: Frames;
  private readonly router = new InputRouter(() => this.schedule());
  private readonly refs = new Refs(this.router.focus, () => this.schedule());
  private pending = false;
  private queued = false;
  private rendering: Promise<void> | undefined;
  private failure: unknown;
  private failed = false;
  private finish: (() => void) | undefined;
  private readonly done = new Promise<void>((resolve) => {
    this.finish = resolve;
  });
  private readonly interrupt = (): void => this.stop();
  constructor(
    render: () => Child,
    private readonly options: AppOptions = {},
  ) {
    this.terminal = options.terminal ?? new ProcessTerminal();
    this.frames = new Frames(this.terminal, options.mode ?? "fullscreen");
    const element = new Element({
      kind: "component",
      children: [],
      props: {},
      call: { identity: render, render },
    });
    this.root = mounted(element, null);
  }
  get status(): AppStatus {
    return this.state;
  }
  get stats(): Readonly<Frames["stats"]> {
    return this.frames.stats;
  }
  async run(): Promise<void> {
    if (this.state !== "created")
      throw new Error("An app can only run once. Create another app to restart.");
    this.state = "starting";
    try {
      this.listen();
      if (!this.options.signal?.aborted) {
        await this.terminal.start(this.options.mode ?? "fullscreen", (event) =>
          this.dispatch(event),
        );
        if (this.state === "starting") {
          this.state = "running";
          await this.flush();
        }
        if (this.terminal instanceof ProcessTerminal && !process.stdout.isTTY) this.stop();
      } else this.stop();
      await this.done;
    } catch (error) {
      this.fail(error);
    }
    await this.cleanup();
    if (this.failed) throw this.failure;
  }
  stop(): void {
    if (this.state === "stopped" || this.state === "stopping") return;
    this.state = "stopping";
    this.finish?.();
  }
  private fail(error: unknown): void {
    if (!this.failed) {
      this.failed = true;
      this.failure = error;
    }
    this.stop();
  }
  schedule(): void {
    if (this.state !== "running") return;
    this.pending = true;
    if (this.queued || this.rendering) return;
    this.queued = true;
    queueMicrotask(() => {
      this.queued = false;
      void this.flush().catch((error) => this.fail(error));
    });
  }
  async flush(): Promise<void> {
    if (this.rendering) {
      await this.rendering;
      return;
    }
    if (this.state !== "running") return;
    this.pending = false;
    this.rendering = this.render();
    try {
      await this.rendering;
    } finally {
      this.rendering = undefined;
      if (this.pending) this.schedule();
    }
  }
  private async render(): Promise<void> {
    reconcile(this.root, this.root.element, { app: this, schedule: () => this.schedule() });
    this.router.focus.refresh(this.root);
    await this.frames.commit(this.root, this.router.focus.current);
    if (this.state !== "running") return;
    this.refs.commit(this.root);
    commitEffects(this.root);
  }
  private dispatch(event: TerminalEvent): void {
    if (this.state !== "running") return;
    try {
      if (event.type === "key") {
        if (this.options.exitOnCtrlC !== false && event.event.ctrl && event.event.key === "c")
          this.stop();
        else this.router.key(this.root, event.event);
      } else if (event.type === "mouse") this.router.mouse(this.root, event.event);
      else this.schedule();
    } catch (error) {
      this.fail(error);
    }
  }
  private listen(): void {
    this.options.signal?.addEventListener("abort", this.interrupt, { once: true });
    if (this.terminal instanceof ProcessTerminal) {
      process.on("SIGINT", this.interrupt);
      process.on("SIGTERM", this.interrupt);
    }
  }
  private async cleanup(): Promise<void> {
    this.options.signal?.removeEventListener("abort", this.interrupt);
    process.off("SIGINT", this.interrupt);
    process.off("SIGTERM", this.interrupt);
    if (this.rendering) {
      try {
        await this.rendering;
      } catch (error) {
        this.fail(error);
      }
    }
    try {
      this.router.focus.set(undefined);
    } catch (error) {
      this.fail(error);
    }
    try {
      unmount(this.root);
    } catch (error) {
      this.fail(error);
    }
    try {
      await this.terminal.stop();
    } catch (error) {
      this.fail(error);
    }
    this.state = "stopped";
  }
}
export function createApp(render: () => Child, options?: AppOptions): App {
  return new App(render, options);
}
