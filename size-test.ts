import { HStack, Renderer, Surface, Text, VStack } from ".";

const app = VStack(
  Text("=== Text Sizing & Background Tests ===").style({
    background: "blue",
    foreground: "white",
    padding: 1,
  }),

  // Test 1: Explicit width constraint
  Text("Test 1: Explicit width=30").style({ bold: true }),
  Text(
    "This is a long text that should wrap at exactly 30 characters per line",
  ).style({
    background: "red",
    width: 30,
  }),

  // Test 2: MaxWidth constraint
  Text("Test 2: maxWidth=25").style({ bold: true }),
  Text("This text should wrap at 25 characters maximum width constraint").style(
    {
      background: "green",
      maxWidth: 25,
    },
  ),

  // Test 3: MinWidth constraint
  Text("Test 3: minWidth=40, short text").style({ bold: true }),
  Text("Short").style({
    background: "yellow",
    foreground: "black",
    minWidth: 40,
  }),

  // Test 4: Character wrap with leading spaces
  Text("Test 4: Character wrap, leading spaces").style({ bold: true }),
  Text("    This starts with spaces and should char-wrap properly").style({
    background: "cyan",
    foreground: "black",
    width: 20,
    textWrap: "char",
  }),

  // Test 5: Word wrap with leading spaces
  Text("Test 5: Word wrap, leading spaces").style({ bold: true }),
  Text("    This starts with spaces and should word-wrap properly").style({
    background: "magenta",
    width: 20,
    textWrap: "word",
  }),

  // Test 6: Line clamp
  Text("Test 6: Line clamp=2").style({ bold: true }),
  Text(
    "This is a very long text that should be clamped to exactly two lines and no more even if it would normally wrap to more",
  ).style({
    background: "blue",
    width: 30,
    textWrap: "word",
    lineClamp: 2,
  }),

  // Test 7: Background alignment check
  Text("Test 7: Background alignment").style({ bold: true }),
  HStack(
    Text("Left").style({ background: "red", width: 10 }),
    Text("Center").style({ background: "green", width: 10 }),
    Text("Right").style({ background: "blue", width: 10 }),
  ),

  // Test 8: Mixed constraints
  Text("Test 8: minWidth=20, maxWidth=40, width=30").style({ bold: true }),
  Text("This should respect the width=30 constraint").style({
    background: "gray",
    minWidth: 20,
    maxWidth: 40,
    width: 30,
  }),

  // Test 9: Container constraint vs explicit width
  Text("Test 9: Explicit width larger than container").style({ bold: true }),
  Text("This text has width=50 but container is maxWidth=30").style({
    background: "yellow",
    width: 50,
    maxWidth: 30,
  }),

  // Test 10: Very long word
  Text("Test 10: Very long word").style({ bold: true }),
  Text("Supercalifragilisticexpialidocious should break properly").style({
    background: "purple",
    width: 20,
    textWrap: "word",
  }),
).style({
  gap: 1,
  padding: 2,
});

const renderer = new Renderer();
const surface = new Surface(app, renderer);

surface.startRender({ cursor: { visibility: "hidden" } });

// Keep running to interact with console
console.log("\nTest running. Check console panel for debug info:");
console.log("1. Background rectangles matching text width exactly");
console.log("2. Text wrapping at correct character positions");
console.log("3. Leading whitespace properly handled");
console.log("4. All sizing constraints respected");
