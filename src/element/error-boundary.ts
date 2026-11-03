import type { Child } from "./node";

import { component, Element } from "./node";

export interface ErrorBoundaryProps {
  fallback: (error: unknown, reset: () => void) => Child;
}

const Content = component(function BoundaryContent({
  render,
}: {
  render: () => Child;
}) {
  return render();
});

/** Keep hook state in a child so recovery always remounts the failed content. */
export function errorBoundary(
  render: () => Child,
  fallback: ErrorBoundaryProps["fallback"],
): Element {
  return new Element({
    kind: "component",
    children: [],
    props: { errorBoundary: { fallback } },
    call: {
      name: "ErrorBoundary",
      identity: errorBoundary,
      render: () => Content({ render }),
    },
  });
}

export const fallbackContent = component(
  (options: {
    render: ErrorBoundaryProps["fallback"];
    error: unknown;
    reset: () => void;
  }) => options.render(options.error, options.reset),
);
