import type { Clipboard } from "../terminal/clipboard";
import type { Mode, Terminal } from "../terminal/transport";
import type { InputRouter } from "./input";
import type { SelectionMode } from "./selection-mode";
import type { Mounted } from "./tree";

import { unmount } from "./reconcile";
/** Pair process and abort subscriptions with the terminal session that owns them. */
export class SessionSignals {
  constructor(
    private readonly signal: AbortSignal | undefined,
    private readonly interrupt: () => void,
    private readonly processTerminal: boolean,
  ) {}
  start(): void {
    this.signal?.addEventListener("abort", this.interrupt, { once: true });
    if (this.processTerminal) {
      process.on("SIGINT", this.interrupt);
      process.on("SIGTERM", this.interrupt);
    }
  }
  stop(): void {
    this.signal?.removeEventListener("abort", this.interrupt);
    if (this.processTerminal) {
      process.off("SIGINT", this.interrupt);
      process.off("SIGTERM", this.interrupt);
    }
  }
}

export async function releaseSession({
  root,
  router,
  terminal,
  signals,
  rendering,
  failure,
}: {
  root: Mounted;
  router: InputRouter;
  terminal: Terminal;
  signals: SessionSignals;
  rendering: Promise<void> | undefined;
  failure: (error: unknown) => void;
}): Promise<void> {
  signals.stop();
  try {
    await rendering;
  } catch (error) {
    failure(error);
  }
  router.dispose();
  try {
    router.focus.set(undefined);
  } catch (error) {
    failure(error);
  }
  try {
    unmount(root);
  } catch (error) {
    failure(error);
  }
  try {
    await terminal.stop();
  } catch (error) {
    failure(error);
  }
}

export type AppStatus =
  | "created"
  | "starting"
  | "running"
  | "stopping"
  | "stopped";

export interface AppOptions {
  mode?: Mode;
  debug?: boolean;
  terminal?: Terminal;
  signal?: AbortSignal;
  exitOnCtrlC?: boolean;
  clipboard?: Clipboard;
  selection?: SelectionMode;
}
