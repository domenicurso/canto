import type { Mounted } from "../runtime/tree";

/** Shared geometry keeps pointer dragging aligned with the fractional painted thumb. */
export function barGeometry(node: Mounted, horizontal: boolean) {
  const props = node.element.data.props.scroll;
  const length = horizontal ? node.inner.width : node.inner.height;
  const maximum = horizontal ? node.maxOffsetX : node.maxOffset;
  const enabled =
    props?.scrollbar !== "hidden" &&
    (horizontal
      ? props?.axis === "both" || props?.axis === "horizontal"
      : props?.axis !== "horizontal");
  const visible =
    enabled &&
    (maximum > 0 ||
      props?.gutter === "stable" ||
      props?.scrollbar === "visible");
  const thumb = Math.min(
    length,
    Math.max(
      1,
      Math.round((length * 8 * length) / Math.max(1, length + maximum)) / 8,
    ),
  );
  const offset = horizontal ? node.offsetX : node.offset;
  const start = maximum
    ? Math.round((offset / maximum) * (length - thumb) * 8) / 8
    : 0;
  return {
    length,
    maximum,
    thumb,
    start,
    visible,
    x: node.inner.x + (horizontal ? 0 : node.inner.width),
    y: node.inner.y + (horizontal ? node.inner.height : 0),
  };
}
