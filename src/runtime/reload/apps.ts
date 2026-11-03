import type { Child } from "../../element/node";
import type { App } from "../app";
import type { Mounted } from "../components/tree";

import { component } from "../../element/node";
import { walk } from "../components/tree";

const sessionsKey = Symbol.for("canto.hot-apps.v2");
// The registry holds trusted session objects across module re-evaluation, not serialized input.
const globals = globalThis as typeof globalThis & {
  [sessionsKey]?: Map<string, App>;
};
const sessions = (globals[sessionsKey] ??= new Map<string, App>());

export function hotApp(
  id: string,
  render: () => Child,
  create: () => App,
): App {
  const previous = sessions.get(id);
  if (
    previous &&
    (previous.status === "created" ||
      previous.status === "starting" ||
      previous.status === "running")
  ) {
    previous.update(render);
    return previous;
  }
  const app = create();
  sessions.set(id, app);
  return app;
}

export function releaseHotApp(id: string | undefined, app: App): void {
  if (id !== undefined && sessions.get(id) === app) sessions.delete(id);
}

export function replaceRoot(root: Mounted, render: () => Child): void {
  root.element = component(render)();
  for (const node of walk(root)) {
    node.component.refreshing = true;
    node.component.dirty = true;
    node.component.descendantsDirty = true;
  }
}
