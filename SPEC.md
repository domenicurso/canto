# Canto TUI Library — Detailed Specification

## Overview

**Canto** is a declarative, signal-driven TUI (Text User Interface) framework for TypeScript. It enables developers to compose complex terminal UIs using a minimal, component-based API with full support for reactivity, diff-based rendering, and non-destructive updates.

Canto's design philosophy follows these principles:

- **Declarative:** UIs are described through nested node hierarchies (`VStack`, `Text`, `Input`, etc.)
- **Reactive:** Signal-based state model automatically updates layout and rendering
- **Non-destructive Rendering:** Diff-based updates ensure minimal terminal writes
- **Composable:** Nodes can be nested arbitrarily with inherited styles and flexible props

---

## Core Architecture

Canto consists of five interconnected layers:

1. **Signals Engine** – Reactive core (`state`, `computed`, `effect`, `batch`)
2. **Node System** – Hierarchical widget tree (`VStack`, `HStack`, `Text`, etc.)
3. **Layout Engine** – Flexbox-style measuring and positioning
4. **Renderer** – Efficient damage-tracking renderer with multiple bounds modes
5. **Event + Focus System** – Handles keyboard input, focus management, and dispatch

---

## 1. Signal System

Canto's reactivity model is powered by _signals_ — reactive containers that track dependencies and notify observers automatically.

### Core Signal Types

```ts
interface Signal<T> {
  get(): T;
  set(value: T): void;
  subscribe(fn: (value: T) => void): () => void;
}

interface ComputedSignal<T> extends Signal<T> {
  get(): T;
  // read-only - no set()
  subscribe(fn: (value: T) => void): () => void;
}

interface EffectHandle {
  dispose(): void;
}
```

### Signal API

```ts
// Create reactive state
function state<T>(initialValue: T): Signal<T>;

// Create computed signal
function computed<T>(fn: () => T): ComputedSignal<T>;

// Create side effect that runs when dependencies change
function effect(fn: () => void | (() => void)): EffectHandle;

// Batch multiple signal updates
function batch(fn: () => void): void;
```

### Usage Examples

```ts
const count = state(0);
const doubled = computed(() => count.get() * 2);

const cleanup = effect(() => {
  console.log("Count:", count.get());
  // Optional cleanup function
  return () => console.log("Effect cleaned up");
});

// Batch updates to prevent multiple re-renders
batch(() => {
  count.set(2);
  count.set(3); // Only triggers one update
});

// Manual cleanup
cleanup.dispose();
```

### Features

- **Automatic Dependency Tracking:** Computed signals automatically track their dependencies
- **Batching:** `batch(fn)` coalesces multiple updates into a single notification
- **Lazy Evaluation:** Computed signals only recalculate when accessed
- **Memory Management:** Effects return cleanup functions for proper disposal

---

## 2. Node Model

Every element in Canto's UI tree is a `Node` with a consistent interface for styling, layout, and rendering.

### Core Node Interface

```ts
interface Node {
  readonly type: NodeType;
  readonly children: readonly Node[];
  readonly id: string;

  // Fluent API methods
  style(map?: Partial<StyleMap>): Node;
  props(map?: Partial<PropsMap>): Node;
  bind(signal: Signal<string>): Node;
  key(key: string): Node;

  // Internal layout methods
  _measure(constraints: Constraints, inherited: StyleMap): Size;
  _layout(origin: Point, size: Size): void;
  _paint(): PaintResult;
  _invalidate(rect?: Rect): void;
}

type NodeType =
  | "VStack"
  | "HStack"
  | "Text"
  | "Input"
  | "Textarea"
  | "Scrollable";
```

### Supporting Types

```ts
interface Point {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface Constraints {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
}

interface PaintResult {
  spans: Span[];
  rects: Rect[];
}

interface Span {
  x: number;
  y: number;
  text: string;
  style: StyleSnapshot;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  style: StyleSnapshot;
}
```

### Node Constructors

```ts
// Container nodes
function VStack(...children: Node[]): Node;
function HStack(...children: Node[]): Node;

// Content nodes
function Text(content?: string | Signal<string>): Node;
function Input(): Node;
function Textarea(): Node;

// Utility nodes
function Scrollable(child: Node): Node;
```

---

## 3. Style System

The style system provides comprehensive visual and layout control with inheritance and signal reactivity.

### StyleMap Interface

```ts
interface StyleMap {
  // Color and appearance
  color?: Color | Signal<Color>;
  background?: Color | Signal<Color>;
  bold?: boolean | Signal<boolean>;
  italic?: boolean | Signal<boolean>;
  underline?: boolean | Signal<boolean>;

  // Spacing
  padding?: Padding | Signal<Padding>;
  paddingTop?: number | Signal<number>;
  paddingRight?: number | Signal<number>;
  paddingBottom?: number | Signal<number>;
  paddingLeft?: number | Signal<number>;

  // Layout
  width?: Dimension | Signal<Dimension>;
  height?: Dimension | Signal<Dimension>;
  minWidth?: Dimension | Signal<Dimension>;
  minHeight?: Dimension | Signal<Dimension>;
  maxWidth?: Dimension | Signal<Dimension>;
  maxHeight?: Dimension | Signal<Dimension>;

  // Alignment
  xAlign?: HorizontalAlign | Signal<HorizontalAlign>;
  yAlign?: VerticalAlign | Signal<VerticalAlign>;

  // Container-specific
  gap?: number | Signal<number>;

  // Text-specific
  textWrap?: TextWrap | Signal<TextWrap>;

  // Scrollable-specific
  scrollX?: boolean | Signal<boolean>;
  scrollY?: boolean | Signal<boolean>;
  scrollbarBackground?: Color | Signal<Color>;
  scrollbarForeground?: Color | Signal<Color>;
}
```

### Style Types

```ts
// Color system
type Color =
  | "black"
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "magenta"
  | "cyan"
  | "white"
  | "brightBlack"
  | "brightRed"
  | "brightGreen"
  | "brightYellow"
  | "brightBlue"
  | "brightMagenta"
  | "brightCyan"
  | "brightWhite"
  | [number, number, number] // RGB color
  | `#${string}`; // Hex color

// Dimension system
type Dimension =
  | number // Fixed pixels
  | "auto" // Content-based sizing
  | "fill" // Fill available space (100%)
  | `${number}%`; // Percentage of container

// Padding shorthand
type Padding =
  | number // All sides
  | [number, number] // [vertical, horizontal]
  | [number, number, number, number]; // [top, right, bottom, left]

// Alignment
type HorizontalAlign = "left" | "center" | "right";
type VerticalAlign = "top" | "center" | "bottom";
type TextWrap = "none" | "word" | "char";
```

### Style Usage

```ts
// Basic styling
Text("Hello World").style({
  foreground: "white",
  background: "blue",
  bold: true,
  padding: 2,
});

// Responsive styling with signals
const isDark = state(true);
Text("Dynamic").style({
  foreground: computed(() => (isDark.get() ? "white" : "black")),
  background: computed(() => (isDark.get() ? "black" : "white")),
});

// Complex layouts
VStack(Text("Header"), Text("Content")).style({
  gap: 1,
  padding: [2, 4], // 2 vertical, 4 horizontal
  xAlign: "center",
  yAlign: "top",
});
```

---

## 4. Props System

Props define behavioral attributes that are node-specific and not inherited by children.

### PropsMap by Node Type

```ts
// Text props
interface TextProps {
  // Text content (alternative to constructor parameter)
  content?: string | Signal<string>;
}

// Input props
interface InputProps {
  placeholder?: string | Signal<string>;
  disabled?: boolean | Signal<boolean>;

  // Event handlers
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;

  // Input filtering
  filter?: (value: string) => string;
  validator?: (value: string) => boolean;
}

// Textarea props
interface TextareaProps {
  placeholder?: string | Signal<string>;
  disabled?: boolean | Signal<boolean>;

  // Event handlers
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;

  // Text processing
  filter?: (value: string) => string;
  validator?: (value: string) => boolean;
}

// Scrollable props
interface ScrollableProps {
  // External scroll control
  scrollX?: Signal<number>;
  scrollY?: Signal<number>;

  // Scroll event handlers
  onScroll?: (x: number, y: number) => void;

  // Scroll behavior
  scrollStep?: number;
  scrollWheelEnabled?: boolean;
}

// Container props (VStack, HStack)
interface ContainerProps {
  // Focus navigation
  focusable?: boolean;

  // Event handlers
  onFocus?: () => void;
  onBlur?: () => void;
}
```

### Props Usage

```ts
// Input with full configuration
Input()
  .props({
    placeholder: "Enter your name...",
    onChange: (value) => console.log("Changed:", value),
    onSubmit: (value) => console.log("Submitted:", value),
    filter: (value) => value.toLowerCase(),
    validator: (value) => value.length > 0,
  })
  .bind(nameSignal);

// Scrollable with external control
const scrollY = state(0);
Scrollable(longContent).props({
  scrollY,
  onScroll: (x, y) => console.log("Scrolled to:", x, y),
  scrollStep: 3,
});
```

---

## 5. Layout Engine

The layout system uses a two-pass **measure → layout** approach with flexbox-inspired semantics.

### Layout Phases

1. **Measure Phase:** Each node calculates its intrinsic size within given constraints
2. **Layout Phase:** Parent containers position children and assign final bounds
3. **Padding Application:** Containers reduce available space by padding values
4. **Alignment:** Content is aligned within containers based on `xAlign`/`yAlign`
5. **Gap Distribution:** Space between children is applied based on `gap` values

### Constraints System

```ts
interface Constraints {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
}

// Helper functions
function constraints(
  minWidth = 0,
  maxWidth = Infinity,
  minHeight = 0,
  maxHeight = Infinity,
): Constraints;

function tight(width: number, height: number): Constraints;
function loose(maxWidth: number, maxHeight: number): Constraints;
```

### Layout Behavior by Node Type

#### VStack (Vertical Stack)

- **Width:** Maximum of children's widths (within constraints)
- **Height:** Sum of children's heights + gaps
- **Child Positioning:** Vertical stacking with `xAlign` for horizontal alignment

#### HStack (Horizontal Stack)

- **Width:** Sum of children's widths + gaps
- **Height:** Maximum of children's heights (within constraints)
- **Child Positioning:** Horizontal stacking with `yAlign` for vertical alignment

#### Text

- **Width:** Text content width (respects `textWrap` and `maxWidth`)
- **Height:** Number of lines based on wrapping
- **Content:** Alignment within bounds via `xAlign`/`yAlign`

#### Input/Textarea

- **Width:** Content-based or explicit width
- **Height:** Single line (Input) or content-based (Textarea)
- **Cursor:** Managed internally with focus state

#### Scrollable

- **Width/Height:** Child's natural size, clipped to container bounds
- **Overflow:** Creates scrollable viewport with optional scrollbars

### Layout Examples

```ts
// Responsive layout
VStack(
  Text("Header").style({ height: 3 }),
  HStack(
    Text("Sidebar").style({ width: 20 }),
    Text("Main Content").style({ width: "fill" }),
  ).style({ height: "fill" }),
  Text("Footer").style({ height: 2 }),
).style({
  width: "fill",
  height: "fill",
  gap: 1,
});

// Centered dialog
VStack(
  Text("Dialog Title").style({ xAlign: "center", bold: true }),
  Text("Dialog content goes here..."),
  HStack(Text("Cancel"), Text("OK")).style({ gap: 2, xAlign: "right" }),
).style({
  width: 40,
  height: 10,
  padding: 2,
  xAlign: "center",
  yAlign: "center",
});
```

---

## 6. Rendering System

Canto uses a **damage-tracking renderer** that diffs cell buffers to minimize terminal I/O.

### Renderer Interface

```ts
interface Renderer {
  render(root: Node, options: RenderOptions): RenderResult;
  clear(): void;
  resize(width: number, height: number): void;
}

interface RenderOptions {
  mode: RenderMode;
  cursor?: CursorPolicy;

  // Mode-specific options
  x?: number; // manual mode
  y?: number; // manual mode
  width?: number; // manual mode
  height?: number; // manual mode
  maxWidth?: number; // auto mode
  maxHeight?: number; // auto mode
}

type RenderMode = "fullscreen" | "manual" | "auto";
type CursorPolicy = "preserve" | "after" | "hide";

interface RenderResult {
  bounds: {
    used: Rect; // Actual rendered area
    clipped: Rect; // Available area (may be larger than used)
  };
  stats: {
    cellsWritten: number;
    cellsSkipped: number;
    renderTime: number;
  };
}
```

### Render Modes

#### Fullscreen Mode

```ts
renderer.render(root, { mode: "fullscreen" });
```

- Fills entire terminal (`0, 0` to `cols, rows`)
- Automatically handles terminal resize
- Best for full-screen applications

#### Manual Mode

```ts
renderer.render(root, {
  mode: "manual",
  x: 10,
  y: 5,
  width: 60,
  height: 20,
});
```

- Renders to specific rectangle
- Fixed positioning and size
- Useful for embedded widgets

#### Auto Mode

```ts
renderer.render(root, {
  mode: "auto",
  maxWidth: 80,
  maxHeight: 24,
});
```

- Starts at current cursor position
- Expands as needed up to max dimensions
- Good for CLI tools and prompts

### Damage Tracking

The renderer maintains an internal cell buffer and only updates changed regions:

```ts
interface CellBuffer {
  cells: Map<string, Cell>; // key: "x,y"
  bounds: Rect;
}

interface Cell {
  char: string;
  style: StyleSnapshot;
}

interface StyleSnapshot {
  foreground: Color | null;
  background: Color | null;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}
```

### Performance Optimizations

- **Cell Deduplication:** Only writes cells that have changed
- **Run Merging:** Combines adjacent cells into single ANSI sequences
- **Style Caching:** Reuses ANSI codes for identical styles
- **Clip Culling:** Skips rendering outside visible bounds

---

## 7. Event and Focus System

Event handling and focus management are centralized through the `Surface` class.

### Surface Interface

```ts
class Surface {
  constructor(root: Node, renderer: Renderer);

  // Event handling
  dispatch(event: Event): boolean;

  // Focus management
  focus(node: Node): boolean;
  blur(): void;
  focusNext(): boolean;
  focusPrevious(): boolean;

  // Lifecycle
  render(options?: RenderOptions): RenderResult;
  dispose(): void;

  // State
  readonly focusedNode: Node | null;
  readonly root: Node;
}
```

### Event Types

```ts
type Event = KeyPressEvent | TextInputEvent | MouseEvent | ResizeEvent;

interface KeyPressEvent {
  type: "KeyPress";
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
}

interface TextInputEvent {
  type: "TextInput";
  text: string;
}

interface MouseEvent {
  type: "Mouse";
  action: "press" | "release" | "move" | "scroll";
  button?: "left" | "right" | "middle";
  x: number;
  y: number;
  scrollDelta?: { x: number; y: number };
}

interface ResizeEvent {
  type: "Resize";
  width: number;
  height: number;
}
```

### Focus Management

Focus moves through focusable nodes in document order:

1. **Tab:** Move to next focusable node
2. **Shift+Tab:** Move to previous focusable node
3. **Escape:** Clear focus
4. **Enter/Space:** Activate focused node (context-dependent)

```ts
// Making nodes focusable
VStack(
  Input().key("name"),
  Input().key("email"),
  Text("Submit").props({ focusable: true }).key("submit"),
).props({
  onFocus: () => console.log("Container focused"),
});

// Manual focus control
surface.focus(nameInput);
surface.focusNext(); // Move to email input
```

### Event Handling Example

```ts
// Create surface with event handling
const surface = new Surface(root, renderer);

// Handle terminal input
process.stdin.setRawMode(true);
process.stdin.on("data", (data) => {
  const key = parseKey(data);

  if (key.name === "escape" || (key.ctrl && key.name === "c")) {
    process.exit(0);
  }

  surface.dispatch({
    type: "KeyPress",
    key: key.name,
    ctrl: key.ctrl || false,
    shift: key.shift || false,
    alt: key.alt || false,
    meta: key.meta || false,
  });
});

// Handle resize
process.stdout.on("resize", () => {
  surface.dispatch({
    type: "Resize",
    width: process.stdout.columns,
    height: process.stdout.rows,
  });
});
```

---

## 8. Widget Reference

### VStack

Vertical container that stacks children vertically.

```ts
VStack(...children: Node[]): Node

// Relevant styles: gap, xAlign, yAlign, padding
// Relevant props: focusable, onFocus, onBlur
```

### HStack

Horizontal container that arranges children side by side.

```ts
HStack(...children: Node[]): Node

// Relevant styles: gap, xAlign, yAlign, padding
// Relevant props: focusable, onFocus, onBlur
```

### Text

Static or dynamic text content with wrapping and alignment.

```ts
Text(content?: string | Signal<string>): Node

// Relevant styles: foreground, background, bold, italic, underline,
//                  textWrap, xAlign, yAlign, padding
// Relevant props: content
```

### Input

Single-line text input with placeholder and validation.

```ts
Input(): Node

// Relevant styles: foreground, background, width, padding
// Relevant props: placeholder, disabled, onChange, onSubmit,
//                 onFocus, onBlur, filter, validator
```

### Textarea

Multi-line text input with wrapping and scrolling.

```ts
Textarea(): Node

// Relevant styles: foreground, background, width, height, textWrap, padding
// Relevant props: placeholder, disabled, onChange, onFocus, onBlur,
//                 filter, validator
```

### Scrollable

Scrollable container that clips overflow and provides scrollbars.

```ts
Scrollable(child: Node): Node

// Relevant styles: width, height, scrollX, scrollY,
//                  scrollbarForeground, scrollbarBackground
// Relevant props: scrollX, scrollY, onScroll, scrollStep, scrollWheelEnabled
```

---

## 9. Complete Example

Here's a comprehensive example showcasing most of Canto's features:

```ts
import {
  computed,
  effect,
  HStack,
  Input,
  Renderer,
  Scrollable,
  state,
  Surface,
  Text,
  Textarea,
  VStack,
} from "canto";

// Application state
const name = state("");
const email = state("");
const message = state("");
const theme = state<"light" | "dark">("dark");

// Computed values
const isValid = computed(
  () =>
    name.get().length > 0 &&
    email.get().includes("@") &&
    message.get().length > 0,
);

const themeColors = computed(() =>
  theme.get() === "dark"
    ? { fg: "white", bg: "black", accent: "cyan" }
    : { fg: "black", bg: "white", accent: "blue" },
);

// Form component
const form = VStack(
  // Header
  HStack(
    Text("Contact Form").style({
      bold: true,
      foreground: computed(() => themeColors.get().accent),
    }),
    Text(`[${computed(() => theme.get().toUpperCase())}]`).style({
      foreground: computed(() => themeColors.get().fg),
      xAlign: "right",
    }),
  ).style({ width: "fill", gap: 1 }),

  // Form fields
  VStack(
    HStack(
      Text("Name:").style({ width: 8 }),
      Input()
        .bind(name)
        .props({
          placeholder: "Enter your name...",
          validator: (v) => v.length > 0,
        })
        .style({ width: "fill" }),
    ).style({ gap: 1, xAlign: "left" }),

    HStack(
      Text("Email:").style({ width: 8 }),
      Input()
        .bind(email)
        .props({
          placeholder: "you@example.com",
          filter: (v) => v.toLowerCase(),
          validator: (v) => v.includes("@"),
        })
        .style({ width: "fill" }),
    ).style({ gap: 1, xAlign: "left" }),

    VStack(
      Text("Message:"),
      Textarea()
        .bind(message)
        .props({ placeholder: "Your message here..." })
        .style({
          width: "fill",
          height: 6,
          textWrap: "word",
        }),
    ).style({ gap: 1 }),
  ).style({ gap: 2 }),

  // Status and submit
  VStack(
    Text(
      computed(() =>
        isValid.get() ? "✓ Ready to submit" : "Please fill all fields",
      ),
    ).style({
      foreground: computed(() => (isValid.get() ? "green" : "red")),
      xAlign: "center",
    }),

    HStack(
      Text("Toggle Theme")
        .props({
          focusable: true,
          onSubmit: () => theme.set(theme.get() === "dark" ? "light" : "dark"),
        })
        .style({
          foreground: computed(() => themeColors.get().accent),
          padding: [0, 2],
        }),

      Text("Submit")
        .props({
          focusable: true,
          onSubmit: () => {
            if (isValid.get()) {
              console.log("Submitted:", {
                name: name.get(),
                email: email.get(),
                message: message.get(),
              });
            }
          },
        })
        .style({
          foreground: computed(() => (isValid.get() ? "white" : "gray")),
          background: computed(() =>
            isValid.get() ? themeColors.get().accent : "darkGray",
          ),
          bold: true,
          padding: [0, 2],
        }),
    ).style({ gap: 4, xAlign: "center" }),
  ).style({ gap: 1 }),
).style({
  foreground: computed(() => themeColors.get().fg),
  background: computed(() => themeColors.get().bg),
  padding: 3,
  gap: 2,
  width: 60,
  height: 20,
});

// Setup and run
const renderer = new Renderer();
const surface = new Surface(form, renderer);

// Render loop
setInterval(() => {
  surface.render({ mode: "auto", maxWidth: 80, maxHeight: 30 });
}, 16); // ~60fps

// Handle input
process.stdin.setRawMode(true);
process.stdin.on("data", (data) => {
  // Handle exit
  if (data[0] === 3 || data[0] === 27) {
    // Ctrl+C or Escape
    process.exit(0);
  }

  // Parse and dispatch key events
  const event = parseKeyData(data);
  surface.dispatch(event);
});
```

---

## 10. Advanced Features

### Signal Composition

```ts
// Derived state
const firstName = state("John");
const lastName = state("Doe");
const fullName = computed(() => `${firstName.get()} ${lastName.get()}`);

// Effect chains
effect(() => {
  const name = fullName.get();
  if (name.length > 20) {
    console.warn("Name too long:", name);
  }
});

// Conditional computations
const displayName = computed(() => {
  const full = fullName.get();
  return full.length > 15 ? `${full.substring(0, 12)}...` : full;
});
```

### Custom Widgets

```ts
function Button(text: string, onClick?: () => void): Node {
  return Text(text)
    .props({
      focusable: true,
      onSubmit: onClick,
    })
    .style({
      padding: [0, 2],
      background: "blue",
      foreground: "white",
      bold: true,
    });
}

function Dialog(title: string, content: Node, actions: Node[]): Node {
  return VStack(
    Text(title).style({ bold: true, xAlign: "center" }),
    content,
    HStack(...actions).style({ gap: 2, xAlign: "right" }),
  ).style({
    padding: 2,
    background: "black",
    foreground: "white",
    width: 50,
    height: "auto",
  });
}
```

### Memory Management

```ts
// Proper cleanup
const effects: EffectHandle[] = [];

effects.push(
  effect(() => {
    console.log("State changed:", name.get());
  }),
);

// Cleanup on exit
process.on("exit", () => {
  effects.forEach((e) => e.dispose());
  surface.dispose();
});
```

---

## 11. Package Structure

```
canto/
├── src/
│   ├── signals/
│   │   ├── index.ts          # Signal implementation
│   │   ├── state.ts          # State signals
│   │   ├── computed.ts       # Computed signals
│   │   ├── effect.ts         # Effect system
│   │   └── batch.ts          # Batching utilities
│   ├── style/
│   │   ├── index.ts          # Style system
│   │   ├── types.ts          # Style type definitions
│   │   ├── inheritance.ts    # Style inheritance logic
│   │   └── colors.ts         # Color utilities
│   ├── layout/
│   │   ├── index.ts          # Layout engine
│   │   ├── constraints.ts    # Constraint system
│   │   ├── flex.ts           # Flexbox layout
│   │   ├── measure.ts        # Measurement utilities
│   │   └── textwrap.ts       # Text wrapping algorithms
│   ├── widgets/
│   │   ├── node.ts           # Base Node implementation
│   │   ├── vstack.ts         # VStack widget
│   │   ├── hstack.ts         # HStack widget
│   │   ├── text.ts           # Text widget
│   │   ├── input.ts          # Input widget
│   │   ├── textarea.ts       # Textarea widget
│   │   └── scrollable.ts     # Scrollable widget
│   ├── renderer/
│   │   ├── buffer.ts         # Cell buffer management
│   │   ├── diff.ts           # Damage tracking
│   │   ├── terminal.ts       # Terminal I/O
│   │   └── ansi.ts           # ANSI escape codes
│   ├── events/
│   │   ├── index.ts          # Event system exports
│   │   ├── surface.ts        # Surface implementation
│   │   ├── focus.ts          # Focus management
│   │   ├── keyboard.ts       # Keyboard handling
│   │   └── mouse.ts          # Mouse handling
│   └── index.ts              # Main exports
├── examples/
│   ├── hello-world.ts
│   ├── form-example.ts
│   ├── calculator.ts
│   └── file-browser.ts
├── tests/
│   ├── signals.test.ts
│   ├── layout.test.ts
│   ├── widgets.test.ts
│   └── renderer.test.ts
├── package.json
├── tsconfig.json
├── SPEC.md
└── README.md
```

This specification provides a comprehensive foundation for implementing the Canto TUI framework with clear APIs, consistent behavior, and extensive customization capabilities.
