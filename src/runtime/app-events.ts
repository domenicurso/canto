import type { TerminalEvent } from "../terminal/events";
import type { DebugPanel } from "./debug-panel";
import type { Frames } from "./frame";
import type { InputRouter } from "./input";
import type { Mounted } from "./tree";

interface AppEvents {
  root: Mounted;
  router: InputRouter;
  frames: Frames;
  debug: DebugPanel;
  exitOnCtrlC: boolean;
  stop(): void;
  schedule(): void;
}
export function dispatchInput(event: TerminalEvent, app: AppEvents): void {
  if (event.type === "key") {
    if (app.debug.key(event.event)) return;
    if (
      app.exitOnCtrlC &&
      event.event.ctrl &&
      event.event.key === "c" &&
      !event.event.shift
    )
      app.stop();
    else app.router.key(app.root, event.event);
  } else if (event.type === "mouse") {
    if (app.debug.mouse(event.event)) app.router.outside(event.event);
    else app.router.mouse(app.root, event.event);
  } else {
    app.router.resize(app.root);
    app.frames.invalidate();
    app.schedule();
  }
}
