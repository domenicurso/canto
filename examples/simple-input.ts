import { computed, Input, Renderer, state, Surface, Text, VStack } from "..";

// Just create a signal
const text = state("Hello world!");

// Just create an Input widget
const app = VStack(
  Text("Minimal Input Example").style({ bold: true, foreground: "green" }),
  Text("Tab to focus, then type. All keyboard shortcuts work automatically."),
  Text(""),
  Input().bind(text).props({ placeholder: "Type here..." }).style({
    width: 30,
  }),
  Text(""),
  Text(computed(() => `Current value: "${text.get()}"`)).style({
    foreground: "cyan",
  }),
).style({ gap: 1 });

// Just render it - that's all!
const renderer = new Renderer();
const surface = new Surface(app, renderer);

surface.startRender();
