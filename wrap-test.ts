import { Renderer, Surface, Text, VStack } from ".";
import { wrapText } from "./src/layout/textwrap";

// Create some long text that should wrap
const longText =
  "This is a very long line of text that should definitely wrap when the container width is constrained. It has many words and should demonstrate the text wrapping functionality.";

// Test the wrapText function directly
console.log("=== Direct wrapText function tests ===");
console.log("Input text length:", longText.length);
console.log("Input text:", longText);
console.log();

console.log("wrapText(longText, 40, 'none'):");
console.log(wrapText(longText, 40, "none", null));
console.log();

console.log("wrapText(longText, 40, 'word'):");
const wordWrapped = wrapText(longText, 40, "word", null);
console.log(wordWrapped);
console.log("Lines:", wordWrapped.length);
wordWrapped.forEach((line, i) =>
  console.log(`Line ${i}: "${line}" (${line.length})`),
);
console.log();

console.log("wrapText(longText, 40, 'char'):");
const charWrapped = wrapText(longText, 40, "char", null);
console.log(charWrapped);
console.log("Lines:", charWrapped.length);
charWrapped.forEach((line, i) =>
  console.log(`Line ${i}: "${line}" (${line.length})`),
);
console.log();

console.log("wrapText(longText, 40, 'word', 2) - line clamp test:");
const clampedWrapped = wrapText(longText, 40, "word", 2);
console.log(clampedWrapped);
console.log("Lines:", clampedWrapped.length);
clampedWrapped.forEach((line, i) =>
  console.log(`Line ${i}: "${line}" (${line.length})`),
);
console.log();

console.log("=== UI Test ===");

const app = VStack(
  Text("=== Text Wrapping Test ===").style({
    background: "blue",
    foreground: "white",
    padding: 1,
  }),

  Text("Default (word wrap):").style({ bold: true }),
  Text(longText).style({
    background: "gray",
  }),

  Text("Word wrap:").style({ bold: true }),
  Text(longText).style({
    background: "gray",
    textWrap: "word",
  }),

  Text("Character wrap:").style({ bold: true }),
  Text(longText).style({
    background: "gray",
    textWrap: "char",
  }),

  Text("Simple test:").style({ bold: true }),
  Text("Hello world this should wrap").style({
    background: "yellow",
    foreground: "black",
    textWrap: "word",
  }),

  Text("Line clamp test (max 2 lines):").style({ bold: true }),
  Text(longText).style({
    background: "cyan",
    foreground: "black",
    textWrap: "word",
    lineClamp: 2,
  }),

  Text("Leading whitespace test:").style({ bold: true }),
  Text("    This line starts with spaces and should wrap properly").style({
    background: "magenta",
    foreground: "white",
    textWrap: "word",
  }),
).style({
  gap: 1,
  padding: 2,
});

const renderer = new Renderer();
const surface = new Surface(app, renderer);

surface.startRender({ cursor: { visibility: "hidden" } });

// // Exit after a short time
// setTimeout(() => {
//   process.exit(0);
// }, 2000);
