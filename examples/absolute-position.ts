import {
  Stack,
  Text,
  VStack,
  Renderer,
  Surface,
  computed,
  state,
} from "..";

const badgeOffset = state(0);
const badgeLabel = computed(() => `Badge offset: ${badgeOffset.get()}`);

const card = Stack(
  Stack().style({
    position: "absolute",
    inset: 0,
    background: "brightBlack",
    zIndex: -1,
  }),
  Text("Static content A").style({
    background: "#224",
    padding: [0, 1],
  }),
  Text("Static content B").style({
    background: "#446",
    padding: [0, 1],
  }),
  Text(badgeLabel).style({
    position: "absolute",
    top: 0,
    right: 0,
    background: "yellow",
    foreground: "black",
    padding: [0, 1],
    zIndex: 2,
  }),
  Text("Pinned to bottom-left").style({
    position: "absolute",
    bottom: -1,
    left: -2,
    background: "brightBlue",
    foreground: "black",
    padding: [0, 1],
    zIndex: 1,
  }),
  Text("Sliding badge").style({
    position: "absolute",
    top: 4,
    left: computed(() => 2 + badgeOffset.get()),
    background: "brightMagenta",
    foreground: "black",
    padding: [0, 1],
    zIndex: 3,
  }),
).style({
  width: 40,
  height: 12,
  padding: [1, 2],
  gap: 1,
  background: "#111",
});

const app = VStack(
  Text("Absolute positioning demo").style({ bold: true }),
  Text("Absolute children share the same stacking context as static nodes."),
  card,
).style({ gap: 1, padding: [1, 2] });

const renderer = new Renderer();
const surface = new Surface(app, renderer);

surface.startRender({ cursor: { visibility: "hidden" } });

setInterval(() => {
  badgeOffset.set((badgeOffset.get() + 1) % 16);
}, 400);
