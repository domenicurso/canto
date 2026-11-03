import type { KeyEvent, PointerEvent } from "../../element/events";
import type { Child } from "../../element/node";
import type { Rect } from "../../layout/geometry";
import type { Screen } from "../../render/screen";
import type { Terminal } from "../../terminal/transport";
import type { DebugControl } from "./chrome";

import { component } from "../../element/node";
import { layout, positionOverlays } from "../../layout/arrange";
import { LayoutInvalidation } from "../../layout/invalidation";
import { repositionScroll } from "../../layout/scrolling/scroll";
import { resolveStyles } from "../../layout/styling/resolve";
import { draw } from "../../render/painting/paint";
import { Screen as Surface } from "../../render/screen";
import { unavailableClipboard } from "../../terminal/clipboard";
import { commitEffects } from "../components/hooks";
import { reconcile, unmount } from "../components/reconcile";
import { Refs } from "../components/refs";
import { mounted, walk } from "../components/tree";
import { cursorOutput } from "../editor/cursor";
import { setScroll, hit } from "../input/focus";
import { InputRouter } from "../input/router";
import { overlays } from "../overlays";
import { composeInspector } from "./composition";

/** A second Canto tree shares output, but never acquires a terminal or inspects itself. */
export class InspectorHost {
  private root = mounted(component(() => null)(), null);
  private readonly router: InputRouter;
  private readonly refs: Refs;
  private failure?: unknown;
  private readonly invalidation = new LayoutInvalidation();
  keyboard = true;
  private metric?: string;
  constructor(
    private readonly terminal: Terminal,
    private readonly debug: DebugControl,
    private readonly changed: () => void,
  ) {
    this.router = new InputRouter(changed, () => terminal.cellSize, {
      clipboard: () => terminal.clipboard ?? unavailableClipboard,
      terminal: () => terminal,
      selection: () => "text",
      fail: (error) => {
        this.failure = error;
        changed();
      },
    });
    this.refs = new Refs(this.router.focus, changed);
  }
  compose(view: Child, content: Screen, rect: Rect): Screen {
    if (this.failure !== undefined) throw this.failure;
    const terminal = this.terminal;
    this.router.flushScroll(this.root);
    reconcile(this.root, component(() => view)(), {
      schedule: this.changed,
      app: {
        stop: () => this.debug.setVisible(false),
        clipboard: terminal.clipboard ?? unavailableClipboard,
        debug: this.debug,
        selection: this.router.selectionModes.control,
        viewport: { width: terminal.width, height: terminal.height },
      },
    });
    this.router.refresh(this.root);
    resolveStyles(this.root);
    this.invalidation.changed(this.root);
    layout(this.root, content);
    repositionScroll(this.root);
    positionOverlays(this.root);
    const layer = new Surface(
      content.width,
      content.height,
      undefined,
      content.cellSize,
    );
    layer.theme = content.theme;
    draw(this.root, layer, {
      x: 0,
      y: 0,
      width: content.width,
      height: content.height,
    });
    this.router.selection.present(layer, this.root);
    const shown = content.clone();
    composeInspector(shown, layer, rect);
    for (const tooltip of overlays(this.root))
      composeInspector(shown, layer, tooltip.layout.rect);
    return shown;
  }
  get cursor(): string | undefined {
    return this.editing
      ? cursorOutput(this.router.focus.current, this.terminal)
      : undefined;
  }
  get editing(): boolean {
    return Boolean(
      this.keyboard && this.router.focus.current?.element.data.props.input,
    );
  }
  key(event: KeyEvent): boolean {
    if (
      !this.keyboard ||
      (!this.editing &&
        ![
          "tab",
          "up",
          "down",
          "left",
          "right",
          "home",
          "end",
          "pageup",
          "pagedown",
          "enter",
          " ",
        ].includes(event.key))
    )
      return false;
    if (!this.router.focus.current && event.key !== "tab")
      this.router.focus.set(
        walk(this.root).find((node) => node.element.data.props.scroll),
      );
    this.router.key(this.root, event);
    const focused = this.router.focus.current;
    if (
      !event.defaultPrevented &&
      focused?.element.data.props.scroll &&
      ["home", "end"].includes(event.key)
    ) {
      setScroll(
        focused,
        event.key === "home" ? 0 : focused.scrolling.maxOffset,
      );
      this.changed();
    }
    return true;
  }
  mouse(event: PointerEvent, passive = false): string | number | undefined {
    const target = hit(this.root, event, this.root.layout.rect);
    if (passive && event.action === "move") {
      this.router.outside(event);
      const key = target?.element.data.key;
      const metric =
        typeof key === "string" && key.startsWith("metric:") ? key : undefined;
      target?.element.data.props.onMouse?.(event);
      if (metric && metric !== this.metric) this.changed();
      this.metric = metric;
      return key;
    }
    this.router.mouse(this.root, event);
    if (event.action === "press") {
      this.keyboard = true;
      for (
        let node = target?.element.data.props.input ? undefined : target;
        node;
        node = node.parent ?? undefined
      ) {
        if (node.element.data.props.scroll) {
          this.router.focus.set(node);
          break;
        }
      }
    }
    return target?.element.data.key;
  }
  outside(event: PointerEvent): void {
    this.router.outside(event);
    if (event.action === "press") this.keyboard = false;
  }
  commit(): void {
    this.refs.commit(this.root);
    commitEffects(this.root);
  }
  clear(): void {
    this.router.focus.set(undefined);
    this.router.resetPointer();
    unmount(this.root);
    this.root = mounted(component(() => null)(), null);
  }
  dispose(): void {
    this.router.dispose();
    unmount(this.root);
  }
}
