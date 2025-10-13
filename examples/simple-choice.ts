import readline from "readline";

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

// Simple choice prompt state
const choices = ["Red", "Green", "Blue", "Yellow", "Purple"];
const currentIndex = state(0);
const isComplete = state(false);
const selectedValue = state("");
const message = "What is your favorite color";

// Build the UI
const app = VStack(
  HStack(
    Text("?").style({ foreground: "green" }),
    Text(`${message}:`).style({ foreground: "cyan" }),
    Conditional(isComplete).setChild(
      Text(selectedValue).style({ foreground: "yellow" }),
    ),
  ).style({ gap: 1 }),
  Conditional(computed(() => !isComplete.get())).setChild(
    Text("  ↑/↓ to navigate, Enter to confirm").style({ faint: true }),
  ),
  Conditional(computed(() => !isComplete.get())).setChild(
    VStack(
      ...choices.map((choice, index) =>
        HStack(
          Text(
            computed(() => {
              return currentIndex.get() === index ? "→" : " ";
            }),
          ).style({ foreground: "yellow", bold: true }),
          Text(choice).style({
            foreground: "yellow",
            faint: computed(() => currentIndex.get() !== index),
          }),
        ).style({ gap: 1 }),
      ),
    ),
  ),
);

const renderer = new Renderer();
const surface = new Surface(app, renderer);

// Remove Surface's keypress listener and set up our own
process.stdin.removeAllListeners("keypress");

// Set up our own keypress handling
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}
process.stdin.resume();

process.stdin.on("keypress", (_, key) => {
  // Handle Ctrl+C
  if (key && key.ctrl && key.name === "c") {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
    process.stdout.write("\x1b[?25h");
    process.exit(0);
  }

  if (!key) return;

  // If prompt is complete, don't handle special keys
  if (isComplete.get()) {
    return;
  }

  switch (key.name) {
    case "up":
      currentIndex.set(
        (currentIndex.get() - 1 + choices.length) % choices.length,
      );
      break;
    case "down":
      currentIndex.set((currentIndex.get() + 1) % choices.length);
      break;
    case "enter":
    case "return":
      const selected = choices[currentIndex.get()]!;
      selectedValue.set(selected);
      isComplete.set(true);

      // Exit after showing result
      setTimeout(() => {
        console.log(`\nYou selected: ${selected}`);
        process.exit(0);
      }, 500);
      break;
  }
});

// Start the prompt
surface.render({ mode: "auto" });

// Render loop
const interval = setInterval(() => {
  surface.render({ mode: "auto" });
  if (isComplete.get()) {
    clearInterval(interval);
  }
}, 16);
