import type { Screen } from "../../render/screen";
import type { Mounted } from "../components/tree";
import type { ContentFrameStats, FrameStats } from "../frame-stats";
import type { DebugView } from "./chrome";
import type { InspectorHost } from "./host";
import type { DebugSelection } from "./selection";
import type { InspectorActions } from "./view";

import { highlightSelection } from "./box";
import { debugBounds } from "./chrome";
import { DebugSampling } from "./sampling";
import { InspectorView } from "./view";

interface InspectorFrame {
  content: Screen;
  root: Mounted;
  stats: ContentFrameStats;
  previous: FrameStats;
  view: DebugView;
}
export class InspectorPresentation {
  private sampling = new DebugSampling();
  constructor(
    private readonly host: InspectorHost,
    private readonly model: DebugSelection,
    private readonly actions: InspectorActions,
  ) {}
  reset(): void {
    this.sampling = new DebugSampling();
  }
  compose({ content, root, stats, previous, view }: InspectorFrame): Screen {
    const rect = debugBounds(content, view);
    const refresh = this.host.due(content, stats.fps);
    if (refresh) this.model.refresh(root);
    const shown = highlightSelection(
      content,
      this.model,
      view.tab === "elements",
    );
    return this.host.compose(
      refresh
        ? InspectorView({
            model: this.model,
            view,
            rect,
            stats: this.sampling.read(stats, previous, performance.now()),
            screen: content,
            actions: this.actions,
          })
        : undefined,
      shown,
      rect,
    );
  }
}
