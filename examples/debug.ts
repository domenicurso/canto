import { computed, Renderer, state, Surface, Text, VStack } from "..";

const counter = state(0);

// Simple content with animation to generate render activity
// Debug panel is automatically added by Surface
const app = VStack(
  Text("Debug Panel Test").style({
    background: "blue",
    foreground: "white",
    padding: [1, 2],
    bold: true,
  }),
  Text(computed(() => `Counter: ${counter.get()}`)).style({
    foreground: "green",
  }),
  VStack(
    Text("Built-in Debug & Console:").style({ bold: true, foreground: "cyan" }),
    Text("• Press F3 to toggle debug panel"),
    Text("• Press F12 to toggle console"),
    Text("• Type 'help' in console for commands"),
    Text("• Press 'q' to quit"),
  ).style({ italic: true, gap: 0, foreground: "yellow" }),
).style({ gap: 1, padding: 2 });

const renderer = new Renderer();
const surface = new Surface(app, renderer);

// Simple quit handler - debug and console are handled automatically by Surface
surface.onText((event, phase) => {
  if (phase !== "pre") return;

  if (event.text === "q" || event.text === "Q") {
    process.exit(0);
  }
});

// Start rendering - Surface automatically includes debug and console panels
surface.startRender({ cursor: { visibility: "hidden" } });

// Animation to generate render activity
setInterval(() => {
  counter.set((counter.get() + 1) % 1000);
}, 100);

console.log("Debug Panel Example");
console.log("- Debug panel is automatically available in every Surface");
console.log("- Press F3 to toggle debug panel");
console.log("- Press F12 to toggle console");
console.log("- Press 'q' to quit");
