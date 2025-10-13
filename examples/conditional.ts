import {
  computed,
  Conditional,
  HStack,
  Renderer,
  state,
  Surface,
  Text,
  VStack,
} from "..";

// Simple conditional rendering demo
const showMessage = state(true);
const showChoices = state(false);
const counter = state(0);

const app = VStack(
  Text("🎛️ Conditional Widget Demo").style({
    foreground: "green",
    bold: true,
  }),

  Text("Press 'm' to toggle message, 'c' to toggle choices, 'space' to increment counter").style({
    faint: true,
  }),

  Text(""),

  // Always visible counter
  HStack(
    Text("Counter:").style({ foreground: "cyan" }),
    Text(computed(() => counter.get().toString())).style({
      foreground: "yellow",
      bold: true,
    }),
  ).style({ gap: 1 }),

  Text(""),

  // Conditionally rendered message
  Conditional(showMessage).setChild(
    VStack(
      Text("✨ This message is conditionally rendered!").style({
        foreground: "magenta",
        bold: true,
      }),
      Text("It only appears when showMessage is true").style({
        foreground: "brightBlack",
        italic: true,
      }),
    ).style({ gap: 0 }),
  ),

  // Conditionally rendered choices
  Conditional(showChoices).setChild(
    VStack(
      Text("📋 Available Options:").style({
        foreground: "blue",
        bold: true,
      }),
      Text("  → Option A").style({ foreground: "yellow" }),
      Text("  → Option B").style({ foreground: "yellow" }),
      Text("  → Option C").style({ foreground: "yellow" }),
    ).style({ gap: 0 }),
  ),

  // Conditionally rendered based on counter
  Conditional(computed(() => counter.get() >= 5)).setChild(
    Text("🎉 Counter reached 5 or more!").style({
      foreground: "brightGreen",
      bold: true,
    }),
  ),

  Conditional(computed(() => counter.get() >= 10)).setChild(
    Text("🔥 Counter reached 10 or more! Amazing!").style({
      foreground: "brightRed",
      bold: true,
    }),
  ),

  Text(""),

  // Status display
  HStack(
    Text("Status:").style({ foreground: "brightCyan" }),
    Text("Message").style({
      foreground: computed(() => showMessage.get() ? "green" : "red"),
      bold: computed(() => showMessage.get()),
    }),
    Text("|"),
    Text("Choices").style({
      foreground: computed(() => showChoices.get() ? "green" : "red"),
      bold: computed(() => showChoices.get()),
    }),
  ).style({ gap: 1 }),

  Text(""),
  Text("Press Ctrl+C to exit").style({ faint: true }),
).style({ gap: 1 });

const renderer = new Renderer();
const surface = new Surface(app, renderer);

// Remove Surface's default keypress listener
process.stdin.removeAllListeners("keypress");

// Custom keypress handling
if (process.stdin.isTTY) {
  const readline = require("readline");
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
}
process.stdin.resume();

process.stdin.on("keypress", (str: string, key: any) => {
  if (key && key.ctrl && key.name === "c") {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
    process.stdout.write("\x1b[?25h");
    process.exit(0);
    return;
  }

  if (!key) return;

  switch (key.name) {
    case "m":
      showMessage.set(!showMessage.get());
      break;
    case "c":
      showChoices.set(!showChoices.get());
      break;
    case "space":
      counter.set(counter.get() + 1);
      break;
    case "r":
      // Reset everything
      showMessage.set(true);
      showChoices.set(false);
      counter.set(0);
      break;
  }
});

// Start the demo
surface.render({ mode: "auto" });

// Render loop
const interval = setInterval(() => {
  surface.render({ mode: "auto" });
}, 16);

process.on("exit", () => {
  clearInterval(interval);
});
