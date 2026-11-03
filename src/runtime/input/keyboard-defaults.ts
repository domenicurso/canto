import type { KeyEvent } from "../../element/events";
import type { Mounted } from "../components/tree";
import type { ScrollInput } from "../scroll/scroll-input";

import { edit } from "../editor/editing";
import { disabled } from "./focus";

export function defaultKey(
  node: Mounted,
  event: KeyEvent,
  scrolling: ScrollInput,
): boolean {
  if (disabled(node)) return false;
  if (node.element.data.props.input) return edit(node, event);
  if (node.element.data.props.button && ["enter", " "].includes(event.key)) {
    node.element.data.props.button.onPress();
    return true;
  }
  if (node.element.data.kind === "scroll") return scrolling.key(node, event);
  return false;
}
