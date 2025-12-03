import {
  computed,
  globalConsole,
  HStack,
  Key,
  Renderer,
  state,
  Surface,
  Text,
  VStack,
  withConsole,
} from "..";

import type { KeyPressEvent } from "..";

const count = state(0);
const label = computed(() => `Counter: ${count.get()}`);

// Simple app content
const appContent = VStack(
  Text()
    .props({ content: "Simple Console Test" })
    .style({
      background: "blue",
      foreground: "white",
      padding: [1, 2],
      bold: true,
    }),
  Text().props({ content: label }).style({
    padding: [0, 1],
  }),
  Text()
    .props({ content: "Press ` (backtick) to toggle console" })
    .style({
      foreground: "yellow",
      italic: true,
    }),
).style({ gap: 1 });

// Wrap content with console overlay
const app = withConsole(appContent, {
  consoleHeight: 8,
  initialVisible: false,
  consolePlac