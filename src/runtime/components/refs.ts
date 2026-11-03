import type { ElementRef } from "../../element/events";
import type { Focus } from "../input/focus";
import type { Mounted } from "./tree";

import { setScroll } from "../input/focus";
import { guard } from "./error-boundary";
import { walk } from "./tree";

export class Refs {
  private readonly attached = new Map<
    Mounted,
    (ref: ElementRef | null) => void
  >();
  constructor(
    private readonly focus: Focus,
    private readonly schedule: () => void,
  ) {}
  commit(root: Mounted): void {
    for (const [node, callback] of this.attached) {
      if (!node.active || callback !== node.element.data.props.ref) {
        if (node.active) callback(null);
        this.attached.delete(node);
      }
    }
    for (const node of walk(root)) {
      const callback = node.element.data.props.ref;
      if (!callback || this.attached.has(node)) continue;
      const ref: ElementRef = {
        get rect() {
          return { ...node.layout.rect };
        },
        focus: () => this.focus.set(node),
        scrollTo: (offset) => {
          setScroll(node, offset);
          this.schedule();
        },
      };
      this.attached.set(node, callback);
      guard(node, () => callback(ref));
    }
  }
}
