import {
  computed,
  HStack,
  Key,
  Renderer,
  Scrollable,
  state,
  Surface,
  Text,
  VStack,
} from "..";

const message = "What is your favorite color";
const choices = [
  "Red",
  "Green",
  "Blue",
  "Yellow",
  "Purple",
  "Orange",
  "Pink",
  "Black",
];

const current = state(0);
const isComplete = state(false);
const selectedValue = state("");

const scrollX = state(0);
const scrollY = state(0);

// Build the UI
const app = VStack(
  HStack(
    Text("?").style({ foreground: "green" }),
    Text(`${message}:`).style({ foreground: "cyan" }),
    Text(selectedValue).style({ foreground: "yellow" }).when(isComplete),
  ).style({ gap: 1 }),
  Text("↑/↓ to navigate, Enter to select")
    .style({ faint: true, padding: [0, 2] })
    .unless(isComplete),
  Scrollable(
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
    ).style({ height: "hug" }),
  )
    .props({
      scrollX,
      scrollY,
      scrollWheelEnabled: false,
    })
    .style({ height: 4 })
    .unless(isComplete),
);

const renderer = new Renderer();
const surface = new Surface(app, renderer, { disableConsole: true });

// Event extraction API to handle navigation
surface.onKey((event, phase) => {
  // Only handle in pre-phase and when prompt is not complete
  if (phase !== "pre" || isComplete.get()) return;

  switch (event.key) {
    case Key.ArrowUp:
      current.set((current.get() - 1 + choices.length) % choices.length);
      if (current.get() > scrollY.get() + 3) {
        scrollY.set(current.get() - 3);
      }
      if (current.get() < scrollY.get()) {
        scrollY.set(current.get());
      }
      break;
    case Key.ArrowDown:
      current.set((current.get() + 1) % choices.length);
      if (current.get() > scrollY.get() + 3) {
        scrollY.set(current.get() - 3);
      }
      if (current.get() < scrollY.get()) {
        scrollY.set(current.get());
      }
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
