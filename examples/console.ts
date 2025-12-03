import {
  computed,
  globalConsole,
  HStack,
  Key,
  Renderer,
  state,
  Surface,
  Text,
  VStack,
  withConsole,
} from "..";

import type { KeyPressEvent, TextInputEvent } from "..";

const count = state(0);

const label1 = computed(() => `Data Point A: ${"#".repeat(count.get())}`);
const label2 = computed(() => `Data Point B: ${"#".repeat(count.get() * 1.4)}`);

// Main application content
const appContent = VStack(
  Text("Live Data Feed with Console").style({
    background: "red",
    padding: [1, 2],
  }),
  VStack(Text(label1), Text(label2)).style({
    background: "#4ACFFF",
    foreground: "black",
    padding: [1, 2],
  }),
  HStack(
    Text("Press 'c', ` (backtick), or F12 to toggle console."),
    Text("Type 'help' in console for commands.").style({ bold: true }),
  ).style({ italic: true, gap: 1 }),
).style({ gap: 1 });

// Wrap content with console overlay
const app = withConsole(appContent, {
  consoleHeight: 12,
  toggleKey: "`",
  initialVisible: false,
  consolePlaceholder: "Enter command (help for options)...",
  maxMessages: 50,
  onConsoleInput: (input: string) => {
    const trimmed = input.trim().toLowerCase();

    switch (trimmed) {
      case "help":
        globalConsole.info("Available commands:");
        globalConsole.log("  help - Show this help message");
        globalConsole.log("  clear - Clear console messages");
        globalConsole.log("  start - Start counter animation");
        globalConsole.log("  stop - Stop counter animation");
        globalConsole.log("  reset - Reset counter to 0");
        globalConsole.log("  status - Show current status");
        globalConsole.log("  test - Add test messages");
        break;

      case "clear":
        globalConsole.clear();
        break;

      case "start":
        if (!intervalId) {
          startAnimation();
          globalConsole.info("Counter animation started");
        } else {
          globalConsole.warn("Animation already running");
        }
        break;

      case "stop":
        if (intervalId) {
          stopAnimation();
          globalConsole.info("Counter animation stopped");
        } else {
          globalConsole.warn("Animation not running");
        }
        break;

      case "reset":
        count.set(0);
        globalConsole.info("Counter reset to 0");
        break;

      case "status":
        globalConsole.info(
          `Counter: ${count.get()}, Running: ${intervalId !== null}`,
        );
        break;

      case "test":
        globalConsole.log("This is a log message");
        globalConsole.info("This is an info message");
        globalConsole.warn("This is a warning message");
        globalConsole.error("This is an error message");
        globalConsole.debug("This is a debug message");
        break;

      default:
        if (trimmed) {
          globalConsole.error(`Unknown command: ${input}`);
          globalConsole.info("Type 'help' for available commands");
        }
        break;
    }
  },
});

const renderer = new Renderer();
const surface = new Surface(app, renderer);

// Register the overlay with global console manager
globalConsole.setOverlay(app);

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

// Set surface reference for focus management
app.setSurface(surface);

// Handle text input for console toggle (regular letters)
surface.onText((event: TextInputEvent, phase) => {
  if (phase !== "pre") return;

  // Only handle toggle keys when console is not visible
  // This prevents intercepting text input meant for the console input field
  if (!globalConsole.isVisible()) {
    // Toggle console with 'c' or backtick
    if (event.text === "c" || event.text === "`") {
      globalConsole.toggle();
      globalConsole.log(
        `Console toggled ${globalConsole.isVisible() ? "on" : "off"}`,
      );
    }

    if (event.text === "q") {
      process.exit(0);
    }
  }
});

// Handle special keys
surface.onKey((event: KeyPressEvent, phase) => {
  if (phase !== "pre") return;

  // Toggle with F12
  if (event.key === Key.F12) {
    globalConsole.toggle();
    return;
  }

  // Hide console with Escape
  if (event.key === Key.Escape) {
    globalConsole.hide();
  }
});

// Start rendering
surface.startRender({ cursor: { visibility: "hidden" } });

// Auto-start the animation
startAnimation();

// Add some initial welcome messages
globalConsole.info("Console overlay example started!");
globalConsole.log("Press ` (backtick) or F12 to toggle this console");
globalConsole.log("Type 'help' for available commands");

// Demonstrate periodic logging
let logCount = 0;
setInterval(() => {
  logCount++;
  if (logCount % 50 === 0) {
    // Every 5 seconds (50 * 100ms)
    globalConsole.debug(`Periodic update #${logCount / 50}`);
  }
}, 100);

// Cleanup on exit
process.on("SIGINT", () => {
  stopAnimation();
  process.exit(0);
});
