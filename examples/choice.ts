import {
  computed,
  HStack,
  Key,
  Renderer,
  state,
  Surface,
  Text,
  VStack,
} from "..";

const message = "What is your favorite color";
const choices = ["Red", "Green", "Blue", "Yellow", "Purple", "Orange"];

const current = state(0);
const isComplete = state(false);
const selectedValue = state("");

// Build the UI
const app = VStack(
  HStack(
    Text("?").style({ foreground: "green" }),
    Text(`${message}:`).style({ foreground: "cyan" }),
    Text(selectedValue).style({ foreground: "yellow" }).when(isComplete),
  ).style({ gap: 1 }),
  Text("  ↑/↓ to navigate, Enter to select")
    .style({ faint: true })
    .unless(isComplete),
  VStack(
    ...choices.map((choice, index) =>
      HStack(
        Text(
          computed(() => {
            return current.get() === index ? "→" : " ";
          }),
        ).style({ bold: true }),
        Text(choice).style({
          faint: computed(() => current.get() !== index),
          underline: computed(() => current.get() === index),
        }),
      ).style({ foreground: "yellow", gap: 1 }),
    ),
  ).unless(isComplete),
);

const renderer = new Renderer();
const surface = new Surface(app, renderer);

// Event extraction API to handle navigation
surface.onKey((event, phase) => {
  // Only handle in pre-phase and when prompt is not complete
  if (phase !== "pre" || isComplete.get()) return;

  switch (event.key) {
    case Key.ArrowUp:
      current.set((current.get() - 1 + choices.length) % choices.length);
      break;
    case Key.ArrowDown:
      current.set((current.get() + 1) % choices.length);
      break;
    case Key.Return:
      const selected = choices[current.get()]!;
      selectedValue.set(selected);
      isComplete.set(true);
      console.log(`You selected: ${selected}`);
      surface.stopRender();
      process.exit(0);
  }
});

surface.startRender();
