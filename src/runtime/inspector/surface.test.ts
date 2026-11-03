import { expect, spyOn, test } from "bun:test";

import { column } from "../../element/factories";
import { Screen } from "../../render/screen";
import { mounted } from "../components/tree";
import { InspectorSurface } from "./surface";

test("busy apps reuse the inspector between sampling deadlines while input and resizes refresh immediately", () => {
  let time = 1000;
  const clock = spyOn(performance, "now").mockImplementation(() => time);
  try {
    const surface = new InspectorSurface();
    const screen = new Screen(80, 24);
    const root = mounted(column(), null);
    expect(surface.due(screen, 60)).toBe(true);
    surface.render(root, screen);
    for (time = 1016; time < 1250; time += 16)
      expect(surface.due(screen, 60)).toBe(false);
    time = 1250;
    expect(surface.due(screen, 60)).toBe(true);
    surface.render(root, screen);
    expect(surface.due(screen, 1)).toBe(true);
    expect(surface.due(new Screen(60, 24), 60)).toBe(true);
    surface.dirty = true;
    expect(surface.due(screen, 60)).toBe(true);
    surface.clear();
    expect(surface.layer).toBeUndefined();
  } finally {
    clock.mockRestore();
  }
});
