/**
 * Enhanced Console API Demo
 *
 * This example demonstrates the new and improved console system with:
 *
 * 🔥 Key Features:
 * • Automatic timestamps for all log messages
 * • Color coding by log level (info=white, warn=yellow, error=red, debug=green)
 * • Automatic file and line number detection via stack trace parsing
 * • Clean metadata display right-aligned in brackets
 * • Full API: .log(), .info(), .warn(), .error(), .debug()
 * • ConsoleMessage objects with structured metadata
 * • Works with both global console and direct console instances
 *
 * 🎮 Usage:
 * • Press ` (backtick) or 'c' to toggle console
 * • Press SPACE to increment counter (shows logging)
 * • Press 'r' to reset counter
 * • Press 'd' to run demo sequence
 * • Type 'help' in console for all commands
 *
 * 🧪 Try these console commands:
 * • help - Show all available commands
 * • test - Run test messages showing all log levels
 * • demo - Step-by-step demonstration
 * • increment/reset - Control the counter
 * • error/warn - Test specific log levels
 *
 * The console now automatically captures caller information and formats
 * everything cleanly with right-aligned metadata showing timestamp,
 * log level, and file:line information.
 */

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

const counter = state(0);
const demoStep = state(0);

// Function to demonstrate different logging scenarios
function demonstrateLogging() {
  const step = demoStep.get();

  switch (step) {
    case 0:
      globalConsole.info("Console enhanced demo started!");
      globalConsole.log(
        "Regular log message with automatic timestamp and location",
      );
      break;
    case 1:
      globalConsole.warn("This is a warning message - notice the yellow color");
      globalConsole.error("This is an error message - notice the red color");
      break;
    case 2:
      globalConsole.debug("This is a debug message - notice the green color");
      globalConsole.info(
        "All messages automatically capture file and line info",
      );
      break;
    case 3:
      // Simulate nested function calls to show stack trace works
      function nestedFunction() {
        function deeperFunction() {
          globalConsole.log(
            "Message from nested function - check the metadata!",
          );
        }
        deeperFunction();
      }
      nestedFunction();
      break;
    case 4:
      // Test rapid logging
      for (let i = 0; i < 5; i++) {
        globalConsole.info(`Rapid log message #${i + 1}`);
      }
      break;
    default:
      globalConsole.log("Demo completed! Type 'demo' to restart");
      globalConsole.info("Notice the color coding and right-aligned metadata");
      demoStep.set(-1);
      break;
  }

  if (step >= 0) {
    demoStep.set(step + 1);
  }
}

const counterLabel = computed(() => `Counter: ${counter.get()}`);
const featuresText = computed(() =>
  [
    "Enhanced Console Features:",
    "• Automatic timestamps for all messages",
    "• Color coding: info (white), warn (yellow), error (red), debug (green)",
    "• Automatic file and line number detection",
    "• Clean metadata display on the right",
    "• Support for .log(), .info(), .warn(), .error(), .debug()",
  ].join("\n"),
);

// Main application content
const appContent = VStack(
  Text("Enhanced Console API Demo").style({
    bold: true,
    background: "#2D3748",
    foreground: "white",
    padding: [1, 2],
  }),

  Text(featuresText).style({
    background: "#4A5568",
    foreground: "white",
    padding: [1, 2],
  }),

  HStack(
    Text(counterLabel).style({ bold: true }),
    Text("Press SPACE to increment").style({ italic: true }),
  ).style({
    background: "#1A202C",
    foreground: "white",
    padding: [1, 2],
    gap: 2,
  }),

  HStack(
    Text("Press 'c' or ` (backtick) to toggle console."),
    Text("Type 'help' in console for commands.").style({ bold: true }),
  ).style({
    italic: true,
    gap: 1,
    padding: [1, 0],
  }),
).style({ gap: 1 });

// Wrap content with console overlay
const app = withConsole(appContent, {
  consoleHeight: 12,
  toggleKey: "`",
  initialVisible: false,
  consolePlaceholder: "Enter command (try 'help', 'test', 'demo')...",
  maxMessages: 50,
  onConsoleInput: (input: string) => {
    const trimmed = input.trim().toLowerCase();

    switch (trimmed) {
      case "help":
        globalConsole.info("Available commands:");
        globalConsole.log("  help - Show this help message");
        globalConsole.log("  test - Run test messages with all log levels");
        globalConsole.log("  demo - Run step-by-step logging demonstration");
        globalConsole.log("  clear - Clear all console messages");
        globalConsole.log("  increment - Increment the counter");
        globalConsole.log("  reset - Reset the counter to zero");
        globalConsole.log("  error - Test error message");
        globalConsole.log("  warn - Test warning message");
        break;

      case "test":
        globalConsole.debug("Running console test suite...");
        globalConsole.info("Test message 1: Info level (white)");
        globalConsole.warn("Test message 2: Warning level (yellow)");
        globalConsole.error("Test message 3: Error level (red)");
        globalConsole.debug("Test message 4: Debug level (green)");
        globalConsole.log("Test completed! Check the colors and metadata.");
        break;

      case "demo":
        globalConsole.info("Starting logging demonstration...");
        demoStep.set(0);
        demonstrateLogging();
        break;

      case "clear":
        globalConsole.clear();
        globalConsole.info("Console cleared");
        break;

      case "increment":
        const newValue = counter.get() + 1;
        counter.set(newValue);
        globalConsole.info(`Counter incremented to ${newValue}`);
        break;

      case "reset":
        const oldValue = counter.get();
        counter.set(0);
        globalConsole.debug(`Counter reset from ${oldValue} to 0`);
        break;

      case "error":
        globalConsole.error(
          "This is a test error message with automatic metadata",
        );
        break;

      case "warn":
        globalConsole.warn("This is a test warning message");
        break;

      default:
        globalConsole.warn(
          `Unknown command: '${input}' - type 'help' for available commands`,
        );
        break;
    }
  },
});

// Set up the global console
globalConsole.setOverlay(app);

// Create renderer
const renderer = new Renderer();
const surface = new Surface(app, renderer);

// Set surface reference for focus management
app.setSurface(surface);

// Handle text input for console toggle and commands
surface.onText((event: TextInputEvent, phase) => {
  if (phase !== "pre") return;

  // Only handle toggle keys when console is not visible
  if (!globalConsole.isVisible()) {
    if (event.text === "c" || event.text === "`") {
      globalConsole.toggle();
      return;
    }

    if (event.text === " ") {
      const newValue = counter.get() + 1;
      counter.set(newValue);
      globalConsole.info(`Counter incremented to ${newValue} (via spacebar)`);
      return;
    }

    if (event.text === "r") {
      const oldValue = counter.get();
      counter.set(0);
      globalConsole.debug(`Counter reset from ${oldValue} to 0 (via 'r' key)`);
      return;
    }

    if (event.text === "d") {
      demonstrateLogging();
      return;
    }

    if (event.text === "q") {
      globalConsole.info("Goodbye!");
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

// Welcome message
globalConsole.info("Enhanced Console Demo loaded!");
globalConsole.log(
  "Press ` to toggle console, SPACE to increment, 'r' to reset",
);
globalConsole.debug("Type 'help' in console for more commands");
globalConsole.log("Notice the automatic timestamps and file:line info!");

// Demonstrate periodic logging with different levels
let logCount = 0;
setInterval(() => {
  logCount++;

  if (logCount % 10 === 0) {
    globalConsole.debug(`Periodic debug message #${logCount}`);
  } else if (logCount % 7 === 0) {
    globalConsole.warn(`Periodic warning #${logCount} - just for demo`);
  } else if (logCount % 15 === 0) {
    globalConsole.error(`Periodic error #${logCount} - simulated issue`);
  } else if (logCount % 5 === 0) {
    globalConsole.info(`System heartbeat #${logCount} - all systems nominal`);
  }

  // Show off the metadata with a special message every 20 logs
  if (logCount % 20 === 0) {
    globalConsole.log(
      `🎉 Milestone reached: ${logCount} periodic logs generated!`,
    );
    globalConsole.debug("Check out the clean metadata formatting →");
  }
}, 2000);

// Add some initial demo messages to show the formatting
setTimeout(() => {
  globalConsole.info("Starting automatic demo messages...");
  globalConsole.warn("This warning shows the yellow color coding");
  globalConsole.error("This error shows the red color coding");
  globalConsole.debug("This debug message shows the green color coding");
  globalConsole.log("Regular log messages remain white for clarity");
}, 1000);

export { app, surface };

if (import.meta.main) {
  surface.startRender({ cursor: { visibility: "hidden" } });
}
