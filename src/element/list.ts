import type { Child, Element } from "./node";

import { useState } from "../runtime/hooks";
import { box, column, scroll } from "./factories";
import { component } from "./node";

export interface ListOptions<T> {
  height: number;
  itemHeight: number;
  key: (item: T) => string | number;
  render: (item: T, index: number) => Child;
}
interface WindowOptions {
  count: number;
  height: number;
  itemHeight: number;
  render: (index: number) => Child;
  key: (index: number) => string | number;
}
const Window = component((options: WindowOptions) => {
  const [offset, setOffset] = useState(0);
  const start = Math.max(0, Math.floor(offset / options.itemHeight) - 1);
  const end = Math.min(
    options.count,
    Math.ceil((offset + options.height) / options.itemHeight) + 1,
  );
  const rows = Array.from(
    { length: Math.max(0, end - start) },
    (_, position) => {
      const index = start + position;
      return box(options.render(index))
        .height(options.itemHeight)
        .width("fill")
        .key(options.key(index));
    },
  );
  return scroll(
    column(
      box()
        .height(start * options.itemHeight)
        .key("before"),
      column(rows).width("fill").key("items"),
      box()
        .height(Math.max(0, options.count - end) * options.itemHeight)
        .key("after"),
    ).width("fill"),
    { offset, onScroll: setOffset },
  )
    .height(options.height)
    .width("fill");
});
export function list<T>(items: readonly T[], options: ListOptions<T>): Element {
  if (
    !Number.isInteger(options.itemHeight) ||
    options.itemHeight < 1 ||
    !Number.isInteger(options.height) ||
    options.height < 1
  ) {
    throw new Error(
      "A virtual list requires positive integer height and itemHeight values.",
    );
  }
  return Window({
    ...options,
    count: items.length,
    render: (index) => {
      const item = items[index];
      if (item === undefined)
        throw new Error("List items changed while rendering.");
      return options.render(item, index);
    },
    key: (index) => {
      const item = items[index];
      if (item === undefined)
        throw new Error("List items changed while rendering.");
      return options.key(item);
    },
  });
}
