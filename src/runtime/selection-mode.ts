import type { Terminal } from "../terminal/transport";

export type SelectionMode = "text" | "native";
export interface SelectionControl {
  readonly mode: SelectionMode;
  setMode(mode: SelectionMode): Promise<void>;
}
/** Serialize mouse ownership changes so rapid toggles cannot leave tracking in the wrong mode. */
export class SelectionModes {
  readonly control: SelectionControl;
  private active = false;
  private pending = Promise.resolve();
  constructor(
    private readonly terminal: () => Terminal,
    initial: () => SelectionMode,
    private readonly changed: () => void,
  ) {
    let current: SelectionMode | undefined;
    this.control = {
      get mode() {
        return current ?? initial();
      },
      setMode: (mode) => {
        if (mode !== "text" && mode !== "native")
          return Promise.reject(
            new Error("Selection mode must be text or native."),
          );
        const apply = async (): Promise<void> => {
          if (this.active) await this.tracking(mode);
          current = mode;
          this.changed();
        };
        this.pending = this.pending.then(apply, apply);
        return this.pending;
      },
    };
  }
  async start(): Promise<void> {
    await this.pending;
    this.active = true;
    if (this.control.mode === "native") await this.tracking("native");
  }
  stop(): void {
    this.active = false;
  }
  private async tracking(mode: SelectionMode): Promise<void> {
    const terminal = this.terminal();
    if (!terminal.setMouseTracking && mode === "native")
      throw new Error(
        "Native selection requires a terminal adapter with setMouseTracking().",
      );
    await terminal.setMouseTracking?.(mode === "text");
  }
}
