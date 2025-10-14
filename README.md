<img width="7000" height="2251" alt="CantoLarge" src="https://github.com/user-attachments/assets/5546253d-53c0-4f13-9f0b-149466174f86" />

# Canto

**Canto** is a declarative, signal-driven TUI (Text User Interface) framework for TypeScript. It enables developers to compose complex terminal UIs using a minimal, component-based API with full support for reactivity, diff-based rendering, and non-destructive updates.

Canto's design philosophy follows these principles:

- **Declarative:** UIs are described through nested node hierarchies (`VStack`, `Text`, `Input`, etc.)
- **Reactive:** Signal-based state model automatically updates layout and rendering
- **Non-destructive Rendering:** Diff-based updates ensure minimal terminal writes
- **Composable:** Nodes can be nested arbitrarily with inherited styles and flexible props

Below is an example of what a simple Canto app might look like in practice:

```ts
import { computed, Renderer, state, Surface, Text, VStack } from "@domurso/canto"

const count = state(0);

const label1 = computed(() => `Data Point A: ${"#".repeat(count.get())}`);
const label2 = computed(() => `Data Point B: ${"#".repeat(count.get() + 5)}`);

const app = VStack(
  Text("Live Data Feed").style({ background: "red", padding: [1, 2] }),
  VStack(Text(label1), Text(label2)),
  Text("Data Point B is always 5 more units than Point A").style({ italic: true })
).style({ gap: 1 });

const surface = new Surface(app, new Renderer());
surface.startRender({ cursor: { visibility: "hidden" } });

setInterval(() => count.set((count.get() + 1) % 50), 100)
```
