import type { Decoder } from "./decoder";

/** Incomplete control input must expire before it can consume unrelated typing. */
export class InputTimeout {
  private timer: ReturnType<typeof setTimeout> | undefined;
  constructor(private readonly decoder: Decoder) {}
  push(bytes: Uint8Array): void {
    clearTimeout(this.timer);
    this.decoder.push(bytes);
    const paste = this.decoder.pendingPaste;
    this.timer = setTimeout(
      () => {
        if (paste) this.decoder.discardPending();
        else this.decoder.flushEscape();
      },
      paste ? 5000 : 30,
    );
  }
  dispose(): void {
    clearTimeout(this.timer);
    this.decoder.discardPending();
  }
}
