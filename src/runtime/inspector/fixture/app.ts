import type { Rect } from "../../../layout/geometry";

import { box, column, row, text } from "../../../element/factories";
import { Screen } from "../../../render/screen";
import { createApp } from "../../app";
import {
  useApp,
  useEffect,
  useMemo,
  useState,
  useViewport,
} from "../../components/hooks";
import { debugBounds } from "../chrome";
import { debugButton, debugColors } from "../controls";
import { InspectorView } from "../view";
import { fixtureHighlight } from "./highlight";
import { InspectorFixtureModel } from "./model";
import { sampleReadings, sampleScene, scenes } from "./sample";

export function InspectorFixture() {
  const app = useApp();
  const size = useViewport();
  const [, refresh] = useState(0);
  const fixture = useMemo(
    () => new InspectorFixtureModel(app, () => refresh((value) => value + 1)),
    [app],
  );
  const screen = useMemo(
    () => new Screen(size.width, size.height),
    [size.width, size.height],
  );
  useEffect(() => () => fixture.dispose(), [fixture]);
  fixture.prepare(size);
  const rect = debugBounds(
    { width: size.width, height: Math.max(0, size.height - 1) },
    fixture.view,
  );
  rect.y++;
  return column(
    toolbar(fixture),
    sampleScene(fixture.scene).width(fixture.contentWidth(size)),
    fixture.visible &&
      fixture.view.tab === "elements" &&
      fixtureHighlight(fixture.selection, size),
    fixture.visible &&
      fixture.view.picking &&
      pickerSurface(fixture, rect, size.height),
    fixture.visible && fixturePanel(fixture, rect, screen),
  )
    .fill()
    .background(debugColors.background)
    .color(debugColors.text);
}

function fixturePanel(
  fixture: InspectorFixtureModel,
  rect: Rect,
  screen: Screen,
) {
  return InspectorView({
    model: fixture.selection,
    view: fixture.view,
    rect: { ...rect, x: 0, y: 0 },
    stats: sampleReadings,
    screen,
    actions: {
      tab: (tab) => fixture.tab(tab),
      pick: () => fixture.pick(),
      placement: () => fixture.placement(),
      close: () => fixture.show(false),
    },
  })
    .position("absolute")
    .left(rect.x)
    .top(rect.y)
    .width(rect.width)
    .height(rect.height)
    .zIndex(2);
}

// Capture the backdrop during picking so preview controls cannot activate sample buttons.
function pickerSurface(
  fixture: InspectorFixtureModel,
  rect: Rect,
  height: number,
) {
  return box()
    .position("absolute")
    .left(0)
    .top(1)
    .width("fill")
    .height(Math.max(0, height - 1))
    .zIndex(1)
    .onMouse((event) => fixture.pointer(event, rect));
}

function toolbar(fixture: InspectorFixtureModel) {
  return row(
    scenes.map((scene) =>
      debugButton(scene, () => fixture.choose(scene), fixture.scene === scene),
    ),
    debugButton("Reset", () => fixture.reset()),
    !fixture.visible && debugButton("Open", () => fixture.show(true)),
    text("").width("fill"),
    text("F3 inspect fixture ").color(debugColors.muted).wrap("none"),
  )
    .width("fill")
    .height(1);
}

if (import.meta.main) {
  void createApp(InspectorFixture)
    .run()
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
