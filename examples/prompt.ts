import { HStack, Input, Renderer, state, Surface, Text, VStack } from "..";

// Create signals to track input values
const name = state("John Doe");
const email = state("john@example.com");
const message = state(
  "Hello, world! Type something long to test horizontal scrolling and ellipsis...",
);

const app = VStack(
  Text("Drag & Drop Input Widget Demo").style({
    foreground: "green",
    bold: true,
  }),
  Text("All keyboard shortcuts work automatically:").style({
    foreground: "brightBlue",
  }),
  Text("• Tab to focus • Arrows to move • Cmd/Ctrl+A to select all").style({
    faint: true,
  }),

  // Name input
  HStack(
    Text("Name:").style({ foreground: "cyan", width: 10 }),
    Input()
      .bind(name)
      .props({ placeholder: "Enter your name..." })
      .style({
        foreground: "white",
        background: "brightGreen",
        padding: [0, 1],
        width: 25,
      }),
  ).style({ gap: 1 }),

  // Email input
  HStack(
    Text("Email:").style({ foreground: "yellow", width: 10 }),
    Input()
      .bind(email)
      .props({ placeholder: "your@email.com" })
      .style({
        foreground: "black",
        background: "brightYellow",
        padding: [0, 1],
        width: 30,
      }),
  ).style({ gap: 1 }),

  // Message input (demonstrates scrolling)
  HStack(
    Text("Message:").style({ foreground: "magenta", width: 10 }),
    Input()
      .bind(message)
      .props({ placeholder: "Type a long message..." })
      .style({
        foreground: "brightWhite",
        background: "brightMagenta",
        padding: [0, 1],
        width: 40,
      }),
  ).style({ gap: 1 }),

  // Display current values
  VStack(
    HStack(
      Text("Name:").style({ foreground: "brightBlack", width: 10 }),
      Text(name).style({ foreground: "white" }),
    ),
    HStack(
      Text("Email:").style({ foreground: "brightBlack", width: 10 }),
      Text(email).style({ foreground: "white" }),
    ),
    HStack(
      Text("Message:").style({ foreground: "brightBlack", width: 10 }),
      Text(message).style({ foreground: "white" }),
    ),
  ),

  Text("Press Ctrl+C to exit").style({ faint: true }),
).style({ gap: 1 });

// That's it! No manual stdin setup needed.
const renderer = new Renderer();
const surface = new Surface(app, renderer);

surface.startRender();
