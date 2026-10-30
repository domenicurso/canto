import type { ElementRef, KeyEvent } from "./events";
import type { Child } from "./node";

import { useEffect, useMemo, useRef, useState } from "../runtime/hooks";
import { box, column, scroll } from "./factories";
import { ListGeometry } from "./list-geometry";
import { component } from "./node";

export interface WindowOptions {
  count: number;
  height: number | "fill";
  itemHeight: number | ((index: number) => number);
  dataset: readonly unknown[];
  heightIdentity: unknown;
  render: (index: number) => Child;
  key: (index: number) => string | number;
  activeIndex?: number;
  onActiveChange?: (index: number) => void;
}

export const Window = component((options: WindowOptions) => {
  const [offset, setOffset] = useState(0);
  const [measuredHeight, setHeight] = useState(1);
  const [selected, setSelected] = useState(-1);
  const ref = useRef<ElementRef | null>(null);
  const geometry = useMemo(
    () => new ListGeometry(options.count, options.itemHeight),
    [options.dataset, options.heightIdentity],
  );
  const height = options.height === "fill" ? measuredHeight : options.height;
  const active = options.activeIndex ?? selected;
  useEffect(() => {
    if (options.height === "fill")
      setHeight(Math.max(1, ref.current?.rect.height ?? 1));
  });
  useEffect(() => {
    if (active >= 0 && active < options.count)
      setOffset((current) => geometry.reveal(active, current, height));
    else
      setOffset((current) =>
        Math.max(0, Math.min(current, geometry.total - height)),
      );
  }, [active, geometry, height]);
  const top = Math.max(0, Math.min(offset, geometry.total - height));
  return scroll(windowContent(options, geometry, { offset: top, height }), {
    offset: top,
    onScroll: setOffset,
  })
    .height(options.height)
    .width("fill")
    .ref((value) => {
      ref.current = value;
    })
    .onKey(
      (event) =>
        (options.onActiveChange || options.activeIndex !== undefined) &&
        navigate(event, { active, geometry, height, offset: top }, (index) => {
          if (options.activeIndex === undefined) setSelected(index);
          options.onActiveChange?.(index);
          if (options.activeIndex === undefined)
            setOffset(geometry.reveal(index, top, height));
        }),
    );
});

function windowContent(
  options: WindowOptions,
  geometry: ListGeometry,
  viewport: { offset: number; height: number },
): Child {
  const { offset: top, height } = viewport;
  const start = Math.max(0, geometry.indexAt(top) - 1);
  const end = Math.min(options.count, geometry.indexAt(top + height - 1) + 2);
  const rows = Array.from(
    { length: Math.max(0, end - start) },
    (_, position) => {
      const index = start + position;
      return box(options.render(index))
        .height(geometry.height(index))
        .width("fill")
        .key(options.key(index));
    },
  );
  return column(
    box().height(geometry.start(start)).key("before"),
    column(rows).width("fill").key("items"),
    box()
      .height(Math.max(0, geometry.total - geometry.start(end)))
      .key("after"),
  ).width("fill");
}

function navigate(
  event: KeyEvent,
  state: {
    active: number;
    geometry: ListGeometry;
    height: number;
    offset: number;
  },
  select: (index: number) => void,
): void {
  if (
    event.defaultPrevented ||
    event.ctrl ||
    event.alt ||
    event.meta ||
    !state.geometry.count
  )
    return;
  const { active, geometry, height, offset } = state;
  const positions: Record<string, number> = {
    up: active < 0 ? geometry.indexAt(offset) : active - 1,
    down: active < 0 ? geometry.indexAt(offset) : active + 1,
    home: 0,
    end: geometry.count - 1,
    pageup: geometry.indexAt(
      Math.max(0, geometry.start(Math.max(0, active)) - height),
    ),
    pagedown: geometry.indexAt(geometry.start(Math.max(0, active)) + height),
  };
  const index = positions[event.key];
  if (index === undefined || event.shift) return;
  event.preventDefault();
  select(Math.max(0, Math.min(geometry.count - 1, index)));
}
