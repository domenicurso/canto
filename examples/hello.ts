import { computed, Renderer, state, Surface, Text, VStack } from "..";

const count = state(0);
const label = computed(() => `Count: ${count.get()}`);

const app = VStack(Text("Hello Avery Kane"), Text(label)).style({ gap: 1 });

const renderer = new Renderer({ width: 40, height: 10 });
const surface = new Surface(app, renderer);

surface.render({ mode: "auto", maxWidth: 40, maxHeight: 10 });

setInterval(() => {
  count.set(count.get() + 1);
  surface.render({ mode: "auto", maxWidth: 40, maxHeight: 10 });
}, 1000);
