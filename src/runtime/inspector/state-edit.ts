import type { Mounted } from "../components/tree";

import { setScroll } from "../input/focus";
import { parseCompatibleJSON } from "./json-values";

export interface StateEdit {
  restore(): void;
}
export function editState(
  node: Mounted,
  key: string,
  source: string,
): StateEdit {
  if (key.startsWith("state.hook.")) {
    const index = Number(key.slice("state.hook.".length));
    const hook = node.component.hooks[index];
    if (!hook || hook.kind !== "state" || typeof hook.setter !== "function")
      throw new Error("This hook is read-only.");
    const original = hook.value;
    const write = (value: unknown): void => {
      if (
        node.active &&
        node.component.hooks[index] === hook &&
        typeof hook.setter === "function"
      )
        hook.setter(value);
    };
    write(parseCompatibleJSON(source, original));
    return { restore: () => write(original) };
  }
  if (key.startsWith("state.scroll.")) return editScroll(node, key, source);
  return editEditor(node, key, source);
}
function editScroll(node: Mounted, key: string, source: string): StateEdit {
  if (!node.element.data.props.scroll)
    throw new Error("Select a scroll element.");
  const value: unknown = JSON.parse(source);
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
    throw new Error("Scroll offsets must be nonnegative numbers.");
  const field = key.endsWith(".x") ? "x" : "y";
  const original =
    field === "x" ? node.scrolling.offsetX : node.scrolling.offset;
  const write = (next: number): void => {
    if (!node.active) return;
    const props = node.element.data.props.scroll;
    const position = {
      x: node.scrolling.offsetX,
      y: node.scrolling.offset,
      [field]: next,
    };
    setScroll(
      node,
      props?.axis === "both"
        ? position
        : props?.axis === "horizontal"
          ? position.x
          : position.y,
    );
  };
  write(value);
  return { restore: () => write(original) };
}
function editEditor(node: Mounted, key: string, source: string): StateEdit {
  const props = node.element.data.props.input;
  if (!props) throw new Error("Select an input element.");
  const value: unknown = JSON.parse(source);
  const editor = node.editor;
  if (key === "state.editor.value" && typeof value === "string") {
    const original = props.value ?? editor.value;
    const write = (next: string): void => {
      if (!node.active) return;
      editor.value = next;
      node.element.data.props.input?.onChange?.(next);
    };
    write(value);
    return { restore: () => write(original) };
  }
  const field =
    key === "state.editor.cursor"
      ? "cursor"
      : key === "state.editor.anchor"
        ? "anchor"
        : undefined;
  if (
    !field ||
    !(
      (value === null && field === "anchor") ||
      (typeof value === "number" &&
        Number.isInteger(value) &&
        value >= 0 &&
        value <= (props.value ?? editor.value).length)
    )
  )
    throw new Error("Editor positions must be inside the value.");
  const original = editor[field];
  if (field === "cursor" && typeof value === "number") editor.cursor = value;
  else if (field === "anchor" && (value === null || typeof value === "number"))
    editor.anchor = value;
  return {
    restore: () => {
      if (field === "anchor") editor.anchor = original;
      else if (typeof original === "number") editor.cursor = original;
    },
  };
}
