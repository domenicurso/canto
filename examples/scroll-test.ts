import {
  computed,
  globalConsole,
  Key,
  Renderer,
  Scrollable,
  state,
  Surface,
  Text,
  VStack,
  withConsole,
} from "..";

import type { KeyPressEvent } from "..";

const scrollY = state(0);
const scrollX = state(0);

// Create a lot of content to scroll through
const lines: string[] = [];
for (let i = 1; i <= 30; i++) {
  lines.push(
    `Line ${i.toString().padStart(2, "0")}: This is a long line of text that should extend beyond the typical terminal width to test horizontal scrolling functionality. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`,
  );
}

// Create the scrollable content
const scrollableContent = VStack(
  Text("=== SCROLLABLE CONTENT TEST ===").style({
    background: "blue",
    foreground: "white",
    bold: true,
  }),
  Text("Use mouse wheel or arrow keys to scroll").style({
    foreground: "yellow",
  }),
  Text("Shift+Arrow keys for faster scrolling").style({
    foreground: "yellow",
  }),
  Text("Page Up/Down for page scrolling").style({
    foreground: "yellow",
  }),
  Text(
    "Home/End for line start/end, Ctrl+Home/End for document start/end",
  ).style({
    foreground: "yellow",
  }),
  Text("---").style({ faint: true }),
  ...lines.map((line, index) =>
    Text(line).style({ foreground: index % 2 === 0 ? "white" : "cyan" }),
  ),
  Text("---").style({ faint: true }),
  Text("=== END OF CONTENT ===").style({
    background: "red",
    foreground: "white",
    bold: true,
  }),
).style({ gap: 0 });

const scrollStatus = computed(
  () => `Scroll: X=${scrollX.get()}, Y=${scrollY.get()}`,
);

// Create main application with scrollable area
const appContent = VStack(
  Text("Scroll Test Application").style({
    background: "green",
    foreground: "black",
    padding: [1, 2],
    bold: true,
  }),
  Text(scrollStatus).style({
    background: "black",
    foreground: "white",
    padding: [0, 1],
  }),
  Text("Press Ctrl+T to toggle console, Tab to focus scrollable area").style({
    foreground: "yellow",
  }),
  Scrollable(scrollableContent)
    .props({
      scrollX,
      scrollY,
      onScroll: (x: number, y: number) => {
        scrollX.set(x);
        scrollY.set(y);
        globalConsole.log(`Scrolled to: X=${x}, Y=${y}`);
      },
    })
    .style({
      background: "#222222",
      height: 15, // Limit height to force scrolling
      width: "fill",
    }),
  Text(
    "Status: Use mouse wheel, arrow keys, or Tab to focus then navigate",
  ).style({
    foreground: "green",
  }),
).style({ gap: 1, padding: 1 });

// Wrap with console
const app = withConsole(appContent, (input: string) => {
  const trimmed = input.trim().toLowerCase();

  switch (trimmed) {
    case "help":
      globalConsole.log("Available commands:");
      globalConsole.log("  help - Show this help");
      globalConsole.log("  status - Show scroll status");
      globalConsole.log("  top - Scroll to top");
      globalConsole.log("  bottom - Scroll to bottom");
      globalConsole.log("  center - Scroll to center");
      globalConsole.log("  reset - Reset scroll position");
      break;

    case "status":
      globalConsole.log(
        `Current scroll position: X=${scrollX.get()}, Y=${scrollY.get()}`,
      );
      break;

    case "top":
      scrollY.set(0);
      globalConsole.log("Scrolled to top");
      break;

    case "bottom":
      scrollY.set(1000); // Will be clamped by scrollable
      globalConsole.log("Scrolled to bottom");
      break;

    case "center":
      scrollY.set(500); // Approximate center
      globalConsole.log("Scrolled to center");
      break;

    case "reset":
      scrollX.set(0);
      scrollY.set(0);
      globalConsole.log("Scroll position reset");
      break;

    default:
      if (trimmed) {
        globalConsole.error(`Unknown command: ${input}`);
        globalConsole.log("Type 'help' for available commands");
      }
      break;
  }
});

const renderer = new Renderer();
const surface = new Surface(app, renderer);

// Register with global console
globalConsole.setOverlay(app);
app.setSurface(surface);

// Key handling
surface.onKey((event: KeyPressEvent, phase) => {
  if (phase !== "pre") return;

  // Toggle console with Ctrl+T
  if (event.key === "t" && event.ctrl) {
    globalConsole.toggle();
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

// Start rendering
surface.startRender();

// Initial messages
globalConsole.log("Scroll test started!");
globalConsole.log("Try scrolling with:");
globalConsole.log("  • Mouse wheel (if supported)");
globalConsole.log("  • Arrow keys (after pressing Tab to focus)");
globalConsole.log("  • Page Up/Down keys");
globalConsole.log("  • Home/End keys");
globalConsole.log("Type 'help' in console for more commands");

// Focus the scrollable area initially
setTimeout(() => {
  // Find and focus the scrollable node
  const scrollableNodes = surface.root.children.filter(
    (child) => child.type === "Scrollable",
  );
  const firstScrollable = scrollableNodes[0];
  if (firstScrollable) {
    surface.focus(firstScrollable);
    globalConsole.log("Scrollable area focused - try arrow keys!");
  }
}, 100);
