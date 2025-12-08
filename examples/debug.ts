import {
  computed,
  DebugPanel,
  HStack,
  Renderer,
  state,
  Surface,
  Text,
  VStack,
} from "..";

const counter = state(0);
const debugVisible = state(false);

// Create debug panel
const debugPanel = DebugPanel({
  visible: debugVisible,
  position: "top-right",
});

// Simple content with animation to generate render activity
const appContent = VStack(
  Text("Debug Panel Test").style({
    background: "blue",
    foreground: "black",
    padding: [1, 2],
    bold: true,
  }),
  Text(computed(() => `Counter: ${counter.get()}`)).style({
    foreground: "green",
  }),
  Text("Press 'd' to toggle debug panel.").style({
    foreground: "yellow",
  }),
  Text("Press 'q' to quit.").style({
    foreground: "red",
  }),
).style({ gap: 1, padding: 1 });

// Main app with debug panel overlay
const app = HStack(appContent.style({ grow: 1 }), debugPanel).style({
  width: "100%",
  height: "100%",
});

const renderer = new Renderer();
const surface = new Surface(app, renderer);

// Handle input
surface.onText((event, phase) => {
  if (phase !== "pre") return;

  switch (event.text) {
    case "d":
    case "D":
      debugPanel.toggle();
      break;
    case "q":
    case "Q":
      process.exit(0);
  }
});

// Start rendering - the Surface will automatically find and update debug panels
surface.startRender({ cursor: { visibility: "hidden" } });

// Animation to generate render activity
setInterval(() => {
  counter.set((counter.get() + 1) % 1000);
}, 100);
