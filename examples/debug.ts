import {
  computed,
  Debug,
  Renderer,
  state,
  Surface,
  Text,
  VStack,
  withDebug,
} from "..";

const counter = state(0);

// Simple content with minimal animation
const appContent = VStack(
  Text("Minimal Debug Test").style({
    background: "blue",
    foreground: "white",
    padding: [1, 2],
    bold: true,
  }),
  Text(computed(() => `Counter: ${counter.get()}`)),
  Text("Press 'd' to toggle debug panel."),
  Text("Press 'q' to quit."),
).style({ gap: 1, padding: 2 });

// Wrap content with debug overlay
const app = withDebug(appContent, {
  position: "bottom-right",
  initialVisible: true,
});

const renderer = new Renderer();
const surface = new Surface(app, renderer);

// Register the overlay with global debug manager
Debug.setOverlay(app);

// Handle input
surface.onText((event, phase) => {
  if (phase !== "pre") return;

  switch (event.text) {
    case "d":
      Debug.toggle();
      break;
    case "q":
      process.exit(0);
  }
});

// Simple render override to feed stats - but only call once per render
let isUpdatingStats = false;
const originalRender = surface.render.bind(surface);
surface.render = function (options) {
  const result = originalRender(options);

  // Prevent recursive calls during stats update
  if (!isUpdatingStats) {
    isUpdatingStats = true;
    Debug.updateRenderStats({
      cellsWritten: result.stats.cellsWritten,
      cellsSkipped: result.stats.cellsSkipped,
      renderTime: result.stats.renderTime,
    });
    isUpdatingStats = false;
  }

  return result;
};

// Start rendering
surface.startRender({ cursor: { visibility: "hidden" } });

// Simple animation to generate render activity (slow to prevent issues)
setInterval(() => {
  counter.set((counter.get() + 1) % 100);
}, 1000);
