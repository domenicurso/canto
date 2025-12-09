import { computed, HStack, Renderer, state, Surface, Text, VStack } from "..";

const count = state(0);

const label1 = computed(() => `Data Point A: ${"#".repeat(count.get())}`);
const label2 = computed(() => `Data Point B: ${"#".repeat(count.get() * 1.4)}`);

// Simple application content - console and debug panels are automatically added by Surface
const app = VStack(
  Text("Live Data Feed with Console").style({
    background: "red",
    padding: [1, 2],
  }),
  VStack(Text(label1), Text(label2)).style({
    background: "#4ACFFF",
    foreground: "black",
    padding: [1, 2],
  }),
  VStack(
    Text("Built-in Console & Debug:").style({ bold: true, foreground: "cyan" }),
    Text("• Press F12 to toggle console"),
    Text("• Press F3 to toggle debug panel"),
    Text("• Type 'help' in console for commands"),
    Text("• Press 'q' to quit"),
  ).style({ italic: true, gap: 0, foreground: "yellow" }),
).style({ gap: 1, padding: 2 });

const renderer = new Renderer();
const surface = new Surface(app, renderer);

// Counter animation control
let intervalId: Timer | null = null;

function startAnimation() {
  if (intervalId) return;
  intervalId = setInterval(() => {
    count.set((count.get() + 1) % 40);
  }, 100);
}

function stopAnimation() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

// Simple quit handler - console and debug are handled automatically by Surface
surface.onText((event, phase) => {
  if (phase !== "pre") return;

  if (event.text === "q") {
    process.exit(0);
  }
});

// Start rendering - Surface automatically includes console and debug panels
surface.startRender({ cursor: { visibility: "hidden" } });

// Auto-start the animation
startAnimation();

// Cleanup on exit
process.on("SIGINT", () => {
  stopAnimation();
  process.exit(0);
});
