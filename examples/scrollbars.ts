#!/usr/bin/env bun
import { HStack, Renderer, Scrollable, state, Surface, Text, VStack } from "..";

const app = VStack(
  VStack(
    Text("Scrollable Widget with Scrollbars Demo").style({ bold: true }),
    Text("Use arrow keys to scroll, or focus and use mouse wheel"),
    Text("Press Ctrl+C to exit").style({ faint: true, italic: true }),
  ),

  // Create a scrollable container with limited size
  Scrollable(
    VStack(
      // Create content that's larger than the container
      ...Array.from({ length: 40 }, (_, i) =>
        HStack(
          ...Array.from({ length: 20 }, (_, j) =>
            Text(
              `Cell ${(i + 1).toString().padStart(2, "0")}-${(j + 1).toString().padStart(2, "0")}`,
            ).style({
              padding: 1,
              background: (i + j) % 2 === 0 ? "blue" : "green",
              foreground: "black",
            }),
          ),
        ),
      ),
    ),
  )
    .style({
      width: 60, // Smaller than content width
      height: 15, // Smaller than content height
      background: "black",
    })
    .props({
      scrollbarEnabled: true, // Enable scrollbars
      scrollStep: 1,
    }),
).style({
  padding: [1, 2],
  gap: 1,
});

const renderer = new Renderer();
const surface = new Surface(app, renderer);

surface.startRender({ cursor: { visibility: "hidden" } });

// Handle cleanup on exit
process.on("SIGINT", () => {
  process.exit(0);
});

process.on("SIGTERM", () => {
  process.exit(0);
});
