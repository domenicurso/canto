import {
  computed,
  Conditional,
  HStack,
  Key,
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
          ).style({ bold: true }),
          Text(choice).style({
            faint: computed(() => currentIndex.get() !== index),
          }),
        ).style({ foreground: "yellow", gap: 1 }),
      ),
    ),
  ),
);

const renderer = new Renderer();
const surface = new Surface(app, renderer);

// Use the new event extraction API to handle navigation
surface.onKey((event, phase) => {
  // Only handle in pre-phase and when prompt is not complete
  if (phase !== "pre" || isComplete.get()) {
    return;
  }

  switch (event.key) {
    case Key.ArrowUp:
      currentIndex.set(
        (currentIndex.get() - 1 + choices.length) % choices.length,
      );
      break;
    case Key.ArrowDown:
      currentIndex.set((currentIndex.get() + 1) % choices.length);
      break;
    case Key.Return:
      const selected = choices[currentIndex.get()]!;
      selectedValue.set(selected);
      isComplete.set(true);
      console.log(`You selected: ${selected}`);
      process.exit(0);
  }
});

// Use middleware to handle global Ctrl+C gracefully
surface.use((event, next) => {
  if (event.type === "KeyPress" && event.ctrl && event.key === Key.C) {
    process.stdout.write("\x1b[?25h"); // Show cursor
    process.exit(0);
  }
  return next(); // Continue with normal event handling
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
