import type { Child } from "../element/node";
import type { Clipboard } from "../terminal/clipboard";
import type { TerminalEvent } from "../terminal/events";
import type { Terminal } from "../terminal/transport";
import type { SelectionControl } from "./selection-mode";
import type { AppOptions, AppStatus } from "./session";

import { Element } from "../element/node";
import { unavailableClipboard } from "../terminal/clipboard";
import { ProcessTerminal } from "../terminal/process";
import { Frames } from "./frame";
import { commitEffects } from "./hooks";
import { InputRouter } from "./input";
import { reconcile } from "./reconcile";
import { Refs } from "./refs";
import { SessionSignals, releaseSession } from "./session";
import { mounted } from "./tree";

export type { AppOptions, AppStatus } from "./session";
export class App {
  private state: AppStatus = "created";
  private readonly terminal: Terminal;
  private readonly root;
  private readonly frames: Frames;
  private readonly router = new InputRouter(
    () => this.schedule(),
    () => this.terminal.cellSize,
    {
      clipboard: () => this.clipboard,
      fail: (error) => this.fail(error),
      terminal: () => this.terminal,
      selection: () => this.options.selection ?? "text",
    },
  );
  private readonly refs = new Refs(this.router.focus, () => this.schedule());
  private pending = false;
  private preparing = false;
  private queued = false;
  private rendering: Promise<void> | undefined;
  private failure: unknown;
  private failed = false;
  private finish: (() => void) | undefined;
  private readonly done = new Promise<void>((resolve) => {
    this.finish = resolve;
  });
  private readonly signals: SessionSignals;
  constructor(
    render: () => Child,
    private readonly options: AppOptions = {},
  ) {
    this.terminal = options.terminal ?? new ProcessTerminal();
    this.signals = new SessionSignals(
      options.signal,
      () => this.stop(),
      this.terminal instanceof ProcessTerminal,
    );
    this.frames = new Frames(this.terminal, options.mode ?? "fullscreen");
    const element = new Element({
      kind: "component",
      children: [],
      props: {},
      call: { identity: render, render },
    });
    this.root = mounted(element, null);
  }
  get selection(): SelectionControl {
    return this.router.selectionModes.control;
  }
  get clipboard(): Clipboard {
    return (
      this.options.clipboard ?? this.terminal.clipboard ?? unavailableClipboard
    );
  }
  get viewport(): { width: number; height: number } {
    return { width: this.terminal.width, height: this.terminal.height };
  }
  get status(): AppStatus {
    return this.state;
  }
  get stats(): Readonly<Frames["stats"]> {
    return this.frames.stats;
  }
  async run(): Promise<void> {
    if (this.state !== "created")
      throw new Error("An app can only run once; create another to restart.");
    this.state = "starting";
    try {
      this.signals.start();
      if (!this.options.signal?.aborted) {
        await this.terminal.start(this.options.mode ?? "fullscreen", (event) =>
          this.dispatch(event),
        );
        await this.router.selectionModes.start();
        if (this.state === "starting") {
          this.state = "running";
          await this.flush();
        }
        if (this.terminal instanceof ProcessTerminal && !process.stdout.isTTY)
          this.stop();
      } else this.stop();
      await this.done;
    } catch (error) {
      this.fail(error);
    }
    await releaseSession({
      root: this.root,
      router: this.router,
      terminal: this.terminal,
      signals: this.signals,
      rendering: this.rendering,
      failure: (error) => this.fail(error),
    });
    this.state = "stopped";
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
    if (this.state !== "running" || this.preparing) return;
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
    this.preparing = true;
    try {
      this.router.flushScroll(this.root);
    } finally {
      this.preparing = false;
    }
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
    reconcile(this.root, this.root.element, {
      app: this,
      schedule: () => this.schedule(),
    });
    this.router.refresh(this.root);
    await this.frames.commit(
      this.root,
      this.router.focus.current,
      this.router.selection,
    );
    if (this.state !== "running") return;
    this.refs.commit(this.root);
    commitEffects(this.root);
  }
  private dispatch(event: TerminalEvent): void {
    if (this.state !== "running") return;
    try {
      if (event.type === "key") {
        if (
          this.options.exitOnCtrlC !== false &&
          event.event.ctrl &&
          event.event.key === "c" &&
          !event.event.shift
        )
          this.stop();
        else this.router.key(this.root, event.event);
      } else if (event.type === "mouse")
        this.router.mouse(this.root, event.event);
      else {
        this.router.resize(this.root);
        this.frames.invalidate();
        this.schedule();
      }
    } catch (error) {
      this.fail(error);
    }
  }
}
export function createApp(render: () => Child, options?: AppOptions): App {
  return new App(render, options);
}
