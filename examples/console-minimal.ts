import {
  computed,
  globalConsole,
  Key,
  Renderer,
  state,
  Surface,
  Text,
  VStack,
  withConsole,
} from "..";

import type { KeyPressEvent } from "..";

const counter = state(0);
const counterText = computed(() => `Counter: ${counter.get()}`);

// Simple app content
const content = VStack(
  Text("Minimal Console Test"),
  Text(counterText),
  Text("Press Ctrl+T to toggle console, Escape to hide, Ctrl+Q to quit"),
).style({ gap: 1, padding: 1 });

// Wrap with console
const app = withConsole(content, {
  consoleHeight: 8,
  initialVisible: false,
  onConsoleInput: (input: string) => {
    globalConsole.log(`You entered: ${input}`);

    if (input === "increment") {
      counter.set(counter.get() + 1);
      globalConsole.info(`Counter incremented to ${counter.get()}`);
    } else if (input === "reset") {
      counter.set(0);
      globalConsole.info("Counter reset");
    }
  },
});

const renderer = new Renderer();
const surface = new Surface(app, renderer);

// Register with global console
globalConsole.setOverlay(app);

// Set surface reference for focus management
app.setSurface(surface);

// Key handling - use Ctrl combinations to avoid interfering with text input
surface.onKey((event: KeyPressEvent, phase) => {
  if (phase !== "pre") return;

  // Toggle console with Ctrl+T
  if (event.key === "t" && event.ctrl) {
    globalConsole.toggle();
    globalConsole.log(
      `Console toggled ${globalConsole.isVisible() ? "on" : "off"}`,
    );
    return;
  }

  // Hide console with Escape
  if (event.key === Key.Escape) {
    globalConsole.hide();
  }

  // Quit with Ctrl+Q
  if (event.key === "q" && event.ctrl) {
    process.exit(0);
  }
});

// Start
surface.startRender();

// Initial message
globalConsole.info(
  "Console test started! Press Ctrl+T to toggle, Ctrl+Q to quit",
);
