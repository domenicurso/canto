import type { Child, Element } from "../node";

import { Window } from "./list-window";

export interface ListOptions<T> {
  height: number | "fill";
  itemHeight: number | ((item: T, index: number) => number);
  key: (item: T) => string | number;
  render: (item: T, index: number) => Child;
  activeIndex?: number;
  onActiveChange?: (index: number) => void;
}
export function list<T>(items: readonly T[], options: ListOptions<T>): Element {
  if (
    (typeof options.itemHeight === "number" &&
      (!Number.isSafeInteger(options.itemHeight) || options.itemHeight < 1)) ||
    (options.height !== "fill" &&
      (!Number.isSafeInteger(options.height) || options.height < 1))
  ) {
    throw new Error(
      "A virtual list requires positive integer height and itemHeight values.",
    );
  }
  return Window({
    ...options,
    dataset: items,
    heightIdentity: options.itemHeight,
    itemHeight:
      typeof options.itemHeight === "number"
        ? options.itemHeight
        : (index) => {
            const item = items[index];
            if (item === undefined)
              throw new Error("List items changed while measuring.");
            return typeof options.itemHeight === "number"
              ? options.itemHeight
              : options.itemHeight(item, index);
          },
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
