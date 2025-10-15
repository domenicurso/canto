import {
  computed,
  effect,
  HStack,
  Input,
  Key,
  Renderer,
  state,
  Surface,
  Text,
  VStack,
} from "..";

const message = "What is your name";
const defaultValue = "John Doe";

const value = state("");
const error = state("");
const isComplete = state(false);

const inputWidget = Input()
  .bind(value)
  .props({ placeholder: defaultValue })
  .style({
    foreground: "yellow",
    width: "hug",
    shrink: 1,
    minWidth: 1,
  });

// Just create an Input widget
const app = VStack(
  HStack(
    Text("?").style({ foreground: "green" }),
    Text(`${message}:`).style({ foreground: "cyan" }),
    inputWidget,
    Text(error)
      .style({
        foreground: "red",
        paddingLeft: 1,
        shrink: 0,
        width: "hug",
      })
      .unless(computed(() => error.get() === ""))
      .unless(isComplete),
  ).style({ gap: 1, width: "fill" }),
).style({ gap: 1 });

effect(() => {
  error.set(
    value.get() && value.get().length > 20 ? "Maximum length is 20" : "",
  );
});

// Just render it - that's all!
const renderer = new Renderer();
const surface = new Surface(app, renderer);

surface.onKey((event, phase) => {
  if (phase !== "pre") return;

  if (event.key === Key.Return) {
    if (error.get()) return;
    value.set(value.get().trim() || defaultValue);
    isComplete.set(true);
    surface.stopRender();
    console.log("\nUser input:", value.get());
    process.exit(0);
  }
});

surface.startRender();
surface.focus(inputWidget);
