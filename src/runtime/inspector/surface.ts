import type { Screen } from "../../render/screen";
import type { Mounted } from "../components/tree";

import { layout, positionOverlays } from "../../layout/arrange";
import { LayoutInvalidation } from "../../layout/invalidation";
import { repositionScroll } from "../../layout/scrolling/scroll";
import { resolveStyles } from "../../layout/styling/resolve";
import { RetainedPaint } from "../../render/retained";

/** Retain inspector painting independently from the application's frame rate. */
export class InspectorSurface {
  private readonly invalidation = new LayoutInvalidation();
  private readonly painter = new RetainedPaint();
  private size = "";
  layer?: Screen;
  dirty = true;
  private nextAt = 0;
  due(screen: Screen, fps: number): boolean {
    return (
      this.dirty ||
      !this.layer ||
      this.layer.width !== screen.width ||
      this.layer.height !== screen.height ||
      fps < 8 ||
      performance.now() >= this.nextAt
    );
  }
  render(root: Mounted, screen: Screen): Screen {
    resolveStyles(root);
    const size = `${screen.width}:${screen.height}`;
    if (this.invalidation.changed(root) || size !== this.size)
      layout(root, screen);
    repositionScroll(root);
    positionOverlays(root);
    this.size = size;
    this.layer = this.painter.render(root, {
      width: screen.width,
      height: screen.height,
      cellSize: screen.cellSize,
      theme: screen.theme,
    });
    this.dirty = false;
    this.nextAt = performance.now() + 250;
    return this.layer;
  }
  clear(): void {
    this.layer = undefined;
    this.dirty = true;
  }
}
