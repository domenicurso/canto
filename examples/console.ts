import {
  computed,
  Console,
  DebugPanel,
  HStack,
  Key,
  Renderer,
  Stack,
  state,
  Surface,
  Text,
  VStack,
  withConsole,
} from "..";

import type { KeyPressEvent, TextInputEvent } from "..";

const count = state(0);
const debugVisible = state(false);

const label1 = computed(() => `Data Point A: ${"#".repeat(count.get())}`);
const label2 = computed(() => `Data Point B: ${"#".repeat(count.get() * 1.4)}`);

// Create debug panel with absolute positioning
const debugPanel = DebugPanel({
  visible: debugVisible,
  position: "top-right",
}).style({
  position: "absolute",
  top: 0,
  right: 0,
  zIndex: 100,
});

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
  Text("Press 'd' or F3 to toggle debug panel.").style({
    italic: true,
    foreground: "cyan",
  }),
).style({ gap: 1 });

// Wrap content with console overlay first
const consoleApp = withConsole(appContent, {
  consoleHeight: 16,
  toggleKey: "`",
  initialVisible: false,
  maxMessages: 1000,
  onConsoleInput: (input: string) => {
    const trimmed = input.trim().toLowerCase();

    switch (trimmed) {
      case "help":
        Console.log("Available commands:");
        Console.log("  help - Show this help message");
        Console.log("  clear - Clear console messages");
        Console.log("  start - Start counter animation");
        Console.log("  stop - Stop counter animation");
        Console.log("  reset - Reset counter to 0");
        Console.log("  status - Show current status");
        Console.log("  test - Add test messages");
        Console.log("  debug - Toggle debug panel");
        break;

      case "clear":
        Console.clear();
        break;

      case "start":
        if (!intervalId) {
          startAnimation();
          Console.log("Counter animation started");
        } else {
          Console.warn("Animation already running");
        }
        break;

      case "stop":
        if (intervalId) {
          stopAnimation();
          Console.log("Counter animation stopped");
        } else {
          Console.warn("Animation not running");
        }
        break;

      case "reset":
        count.set(0);
        Console.log("Counter reset to 0");
        break;

      case "status":
        Console.log(`Counter: ${count.get()}, Running: ${intervalId !== null}`);
        break;

      case "test":
        Console.log("This is a log message");
        Console.warn("This is a warning message");
        Console.error("This is an error message");
        Console.debug("This is a debug message");
        Console.success("This is a success message");
        break;

      case "debug":
        debugPanel.toggle();
        Console.log(
          `Debug panel ${debugPanel.isDebugVisible() ? "shown" : "hidden"}`,
        );
        break;

      default:
        if (trimmed) {
          Console.error(`Unknown command: ${input}`);
          Console.log("Type 'help' for available commands");
        }
        break;
    }
  },
});

// Main app with absolutely positioned debug panel overlay
const app = Stack(consoleApp, debugPanel).style({
  width: "100%",
  height: "100%",
});

const renderer = new Renderer();
const surface = new Surface(app, renderer);

// Register the console overlay with global manager
Console.setOverlay(consoleApp);

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
consoleApp.setSurface(surface);

// Handle text input for console toggle (regular letters)
surface.onText((event: TextInputEvent, phase) => {
  if (phase !== "pre") return;

  // Only handle toggle keys when console is not visible
  // This prevents intercepting text input meant for the console input field
  if (!Console.isVisible()) {
    // Toggle console with 'c' or backtick
    if (event.text === "c" || event.text === "`") {
      Console.toggle();
    }

    if (event.text === "d") {
      debugPanel.toggle();
    }

    if (event.text === "q") {
      process.exit(0);
    }
  }
});

// Handle special keys
surface.onKey((event: KeyPressEvent, phase) => {
  if (phase !== "pre") return;

  // Toggle console with F12
  if (event.key === Key.F12) {
    Console.toggle();
    return;
  }

  // Toggle debug panel with F3
  if (event.key === Key.F3) {
    debugPanel.toggle();
    return;
  }

  // Hide console with Escape
  if (event.key === Key.Escape) {
    Console.hide();
  }
});

// Start rendering - the Surface will automatically find and update debug panels
surface.startRender({ cursor: { visibility: "hidden" } });

// Auto-start the animation
startAnimation();

// Cleanup on exit
process.on("SIGINT", () => {
  stopAnimation();
  process.exit(0);
});
