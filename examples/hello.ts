import { computed, HStack, Renderer, state, Surface, Text, VStack } from "..";

const count = state(0);

const label1 = computed(() => `Data Point A: ${"#".repeat(count.get())}`);
const label2 = computed(() => `Data Point B: ${"#".repeat(count.get() + 5)}`);

const app = VStack(
  Text("Live Data Feed").style({
    background: "red",
    padding: [1, 2],
  }),
  VStack(Text(label1), Text(label2)),
  HStack(
    Text("All data points are being updated in real time,"),
    Text("reflecting simulated changes in metrics.").style({ bold: true }),
  ).style({ italic: true, gap: 1 }),
).style({ gap: 1 });

const renderer = new Renderer();
const surface = new Surface(app, renderer);

surface.startRender({ cursor: { visibility: "hidden" } });

setInterval(() => {
  count.set((count.get() + 1) % 50); // loop back around for a smooth cycle
}, 100);
