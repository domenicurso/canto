import type { PointerEvent } from "../../../element/events";
import type { Size, Rect } from "../../../layout/geometry";
import type { AppControl } from "../../components/hooks";
import type { DebugView } from "../chrome";
import type { FixtureScene } from "./sample";

import { column, text } from "../../../element/factories";
import { component } from "../../../element/node";
import { layout, positionOverlays } from "../../../layout/arrange";
import { contains } from "../../../layout/geometry";
import { LayoutInvalidation } from "../../../layout/invalidation";
import { repositionScroll } from "../../../layout/scrolling/scroll";
import { resolveStyles } from "../../../layout/styling/resolve";
import { reconcile, unmount } from "../../components/reconcile";
import { mounted, walk } from "../../components/tree";
import { sidebarWidth } from "../chrome";
import { DebugSelection } from "../selection";
import { sampleScene } from "./sample";

/** Owns deterministic target data; the visible inspector remains ordinary application content. */
export class InspectorFixtureModel {
  readonly selection: DebugSelection;
  private root = mounted(component(() => null)(), null);
  scene: FixtureScene = "Sample";
  visible = true;
  view: DebugView = { tab: "elements", picking: false, placement: "overlay" };
  private preparedScene?: FixtureScene;
  private readonly invalidation = new LayoutInvalidation();
  constructor(
    private readonly app: AppControl,
    private readonly changed: () => void,
  ) {
    this.selection = new DebugSelection(changed);
  }
  prepare(size: Size): void {
    const scene = this.scene;
    const replaced = scene !== this.preparedScene;
    const width = this.contentWidth(size);
    reconcile(
      this.root,
      component(function FixtureSample() {
        return column(
          text("").height(1),
          sampleScene(scene).key(scene).width(width),
        ).fill();
      })(),
      {
        app: this.app,
        schedule: this.changed,
      },
    );
    resolveStyles(this.root);
    this.invalidation.changed(this.root);
    layout(this.root, size);
    repositionScroll(this.root);
    positionOverlays(this.root);
    this.selection.refresh(this.root);
    if (replaced) {
      this.selection.selected =
        scene === "Empty"
          ? undefined
          : walk(this.root).find(
              (node) => node.element.data.key === "fixture-card",
            );
      if (scene === "Values")
        this.selection.selected = walk(this.root).find((node) =>
          node.element.data.text?.startsWith("A long value"),
        );
    }
    this.preparedScene = scene;
  }
  reset(): void {
    this.dispose();
    this.root = mounted(component(() => null)(), null);
    this.preparedScene = undefined;
    this.visible = true;
    this.view = { ...this.view, picking: false };
    this.selection.collapsed.clear();
    this.selection.hovered = undefined;
    this.selection.help = undefined;
    this.selection.picking = false;
    this.changed();
  }
  contentWidth(size: Size): number {
    return (
      size.width -
      (this.visible && this.view.placement === "sidebar"
        ? sidebarWidth(size.width)
        : 0)
    );
  }
  choose(scene: FixtureScene): void {
    this.scene = scene;
    this.reset();
  }
  tab(tab: DebugView["tab"]): void {
    this.selection.picking = false;
    this.view = { ...this.view, tab, picking: false };
    this.changed();
  }
  pick(): void {
    this.selection.picking = !this.view.picking;
    this.view = {
      ...this.view,
      tab: "elements",
      picking: this.selection.picking,
    };
    this.changed();
  }
  placement(): void {
    this.view = {
      ...this.view,
      placement: this.view.placement === "sidebar" ? "overlay" : "sidebar",
    };
    this.changed();
  }
  show(visible: boolean): void {
    this.visible = visible;
    this.changed();
  }
  pointer(event: PointerEvent, rect: Rect): void {
    if (
      !this.visible ||
      !this.view.picking ||
      event.y < 1 ||
      contains(rect, event.x, event.y)
    )
      return;
    this.selection.pick(event);
    this.view = { ...this.view, picking: this.selection.picking };
  }
  dispose(): void {
    unmount(this.root);
  }
}
