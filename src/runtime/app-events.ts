import type { TerminalEvent } from "../terminal/input/events";
import type { Mounted } from "./components/tree";
import type { Frames } from "./frame";
import type { InputRouter } from "./input/router";
import type { DebugPanel } from "./inspector/panel";

interface AppEvents {
  root: Mounted;
  router: InputRouter;
  frames: Frames;
  debug: DebugPanel;
  exitOnCtrlC: boolean;
  stop(): void;
  schedule(): void;
  fail(error: unknown): void;
}
export function dispatchInput(event: TerminalEvent, app: AppEvents): void {
  try {
    routeInput(event, app);
  } catch (error) {
    app.fail(error);
  }
}
function routeInput(event: TerminalEvent, app: AppEvents): void {
  if (event.type === "key") {
    if (app.debug.key(event.event)) {
      if (app.debug.picking) app.router.resetPointer();
      return;
    }
    if (
      app.exitOnCtrlC &&
      event.event.ctrl &&
      event.event.key === "c" &&
      !event.event.shift
    )
      app.stop();
    else app.router.key(app.root, event.event);
  } else if (event.type === "mouse") {
    if (app.debug.mouse(event.event)) {
      if (app.debug.picking) app.router.resetPointer();
      else app.router.outside(event.event);
    } else app.router.mouse(app.root, event.event);
  } else {
    app.router.resize(app.root);
    app.frames.invalidate();
    app.schedule();
  }
}
