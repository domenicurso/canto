import type { Mounted } from "../runtime/tree";
import type { Size } from "./geometry";

import { width } from "../text/columns";
import { wrap } from "../text/wrap";
import { allocate } from "./allocation";
import { flowGaps } from "./border-joining";
import { bounded, dimension, edges } from "./geometry";

export function content(node: Mounted): string {
  const props = node.element.data.props.input;
  if (props) return props.value ?? node.value;
  return node.element.data.text ?? "";
}
const measurements = new WeakMap<Mounted, Map<string, Size>>();
export function invalidateMeasurement(node: Mounted): void {
  measurements.delete(node);
}
export function measure(node: Mounted, available: Size): Size {
  const key = `${available.width}:${available.height}`;
  let cache = measurements.get(node);
  if (!cache) {
    cache = new Map();
    measurements.set(node, cache);
  }
  const existing = cache.get(key);
  if (existing) return existing;
  const size = measureSize(node, available);
  // Resizing can produce unbounded constraint combinations during one mounted lifetime.
  if (cache.size >= 8) cache.clear();
  cache.set(key, size);
  return size;
}
function measureSize(node: Mounted, available: Size): Size {
  const s = node.style;
  const [top, right, bottom, left] = edges(s);
  const targetWidth = Math.min(
    s.maxWidth ?? Infinity,
    dimension(s.width, available.width) ?? available.width,
  );
  const inner = {
    width: Math.max(0, targetWidth - left - right),
    height: Math.max(
      0,
      (dimension(s.height, available.height) ?? available.height) -
        top -
        bottom,
    ),
  };
  const natural = intrinsic(node, inner);
  return {
    width: bounded(
      dimension(s.width, available.width) ??
        Math.min(available.width, natural.width + left + right),
      s.minWidth,
      s.maxWidth,
    ),
    height: bounded(
      dimension(s.height, available.height) ?? natural.height + top + bottom,
      s.minHeight,
      s.maxHeight,
    ),
  };
}
function intrinsic(node: Mounted, available: Size): Size {
  const kind = node.element.data.kind;
  if (kind === "text" || kind === "input" || kind === "textarea") {
    const value =
      content(node) || node.element.data.props.input?.placeholder || "";
    const lines = wrap(
      value,
      available.width,
      kind === "input" ? { ...node.style, wrap: "none" } : node.style,
    );
    return {
      width:
        Math.max(kind === "text" ? 0 : 1, ...lines.map(width)) +
        Number(kind === "input"),
      height: Math.max(1, lines.length),
    };
  }
  const scroll = node.element.data.props.scroll;
  const childAvailable = scroll
    ? {
        width:
          scroll.axis === "horizontal" || scroll.axis === "both"
            ? Infinity
            : available.width,
        height: scroll.axis === "horizontal" ? available.height : Infinity,
      }
    : available;
  const children = node.children.filter(
    (child) => child.style.position !== "absolute",
  );
  const sizes = children.map((child) => measure(child, childAvailable));
  if (!sizes.length) return { width: 0, height: 0 };
  const gaps = flowGaps(children, kind === "row");
  if (kind === "row") return measureRow(node, available, gaps);
  if (kind === "overlay")
    return {
      width: Math.max(...sizes.map((size) => size.width)),
      height: Math.max(...sizes.map((size) => size.height)),
    };
  const result = {
    width: Math.max(...sizes.map((size) => size.width)),
    height: sizes.reduce((sum, size) => sum + size.height, gaps),
  };
  if (scroll)
    return {
      width: Math.min(available.width, result.width),
      height: Math.min(available.height, result.height),
    };
  return result;
}

function measureRow(node: Mounted, available: Size, gaps: number): Size {
  const items = allocate(
    node.children.filter((child) => child.style.position !== "absolute"),
    available,
    true,
  );
  return {
    width: items.reduce((sum, item) => sum + item.flow, gaps),
    height: Math.max(
      0,
      ...items.map(
        (item) =>
          measure(item.node, { width: item.flow, height: available.height })
            .height,
      ),
    ),
  };
}
