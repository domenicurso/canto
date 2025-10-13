import { computed, Renderer, state, Surface, Text, VStack } from "..";

const count = state(0);
const label = computed(() => `Count: ${count.get()}`);

const app = VStack(
  Text("Hello, Avery Kane").style({ background: "red", padding: [1, 2] }),
  Text(label),
).style({ gap: 1, xAlign: "center" });

const renderer = new Renderer({ width: 40, height: 10 });
const surface = new Surface(app, renderer);

surface.render({ mode: "auto", maxWidth: 40, maxHeight: 10 });

const interval = setInterval(() => {
  count.set(count.get() + 1);
  surface.render({ mode: "auto", maxWidth: 40, maxHeight: 10 });
}, 100);

// Cleanup on exit
function cleanup() {
  clearInterval(interval);
  renderer.clear();
  process.stdout.write("\x1b[?25h"); // Show cursor
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);
