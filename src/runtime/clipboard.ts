import type { KeyEvent } from "../element/events";
import type { Clipboard } from "../terminal/clipboard";
import type { Selection } from "./selection";
import type { Mounted } from "./tree";

import { content } from "../layout/measure";
import { keyEvent } from "../terminal/events";
import { edit } from "./editing";
import { captureBoundary } from "./error-boundary";

export class ClipboardInput {
  private active = true;
  private pending = Promise.resolve();
  constructor(
    private readonly access: {
      clipboard: () => Clipboard;
      selection: Selection;
      schedule: () => void;
      fail: (error: unknown) => void;
    },
  ) {}
  key(node: Mounted | undefined, event: KeyEvent): boolean {
    const copy =
      (event.alt && event.key === "w") ||
      (event.ctrl &&
        (event.key === "insert" || (event.shift && event.key === "c")));
    const cut = event.ctrl && event.key === "x";
    const paste =
      (event.ctrl && event.key === "v") ||
      (event.shift && event.key === "insert");
    const clipboard = this.access.clipboard();
    const selected = this.access.selection.text(node);
    if (!(copy || cut || paste) || ((copy || cut) && !selected)) return false;
    const editable = node?.element.data.props.input;
    if ((cut || paste) && (!editable || editable.readOnly || editable.disabled))
      return false;
    if (paste && !clipboard.readText) return false;
    const snapshot = node
      ? { value: content(node), cursor: node.cursor, anchor: node.anchor }
      : undefined;
    this.pending = this.pending
      .then(async () => {
        if (!this.active) return;
        const value = paste ? await clipboard.readText?.() : "";
        if (!paste) await clipboard.writeText(selected);
        if (!this.active || !node?.active || !snapshot) return;
        if (
          content(node) !== snapshot.value ||
          node.cursor !== snapshot.cursor ||
          node.anchor !== snapshot.anchor
        )
          return;
        if (cut || paste) {
          edit(node, keyEvent(cut ? "delete" : "paste", { text: value }));
          this.access.selection.clear();
          this.access.schedule();
        }
      })
      .catch((error: unknown) => {
        if (!this.active) return;
        if (!node || !captureBoundary(node, error)) this.access.fail(error);
      });
    return true;
  }
  dispose(): void {
    this.active = false;
  }
}
