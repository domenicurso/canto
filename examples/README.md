# Canto Examples

This directory contains examples demonstrating the capabilities of the Canto TUI (Terminal User Interface) library. Each example showcases different aspects of building interactive terminal applications with reactive state management, dynamic layouts, and rich styling.

## Prerequisites

Make sure you have [Bun](https://bun.sh) installed:

```bash
curl -fsSL https://bun.sh/install | bash
```

## Running Examples

From the project root directory, run any example with:

```bash
bun examples/<example-name>.ts
```

Press `Ctrl+C` to exit any example.

## Examples Overview

### 1. Hello World (`hello.ts`)

A simple animated love message that demonstrates basic Canto concepts.

**Features demonstrated:**

- Basic layout with `VStack` and `HStack`
- Reactive state with `state()` and `computed()`
- Text styling and colors
- Automatic re-rendering with state changes
- Animation with intervals

**Run:**

```bash
bun examples/hello.ts
```

**What you'll see:**

- Animated heart meters that grow over time
- Styled text with backgrounds, padding, and formatting
- Automatic cleanup on exit

---

### 2. Todo List (`todo.ts`)

A fully functional todo list application showcasing interactive forms and list management.

**Features demonstrated:**

- Complex state management with multiple signals
- Interactive input fields with submission
- Dynamic list rendering with computed filtering
- Event handling and keyboard shortcuts
- Batch state updates for performance
- Custom styling and themes

**Run:**

```bash
bun examples/todo.ts
```

**Controls:**

- `Enter`: Add new todo or toggle selected todo
- `Space`: Toggle selected todo completion
- `F`: Cycle through filters (All → Pending → Completed)
- `D`: Delete selected todo
- `Tab/Shift+Tab`: Navigate between elements
- `Ctrl+C`: Quit

**What you'll see:**

- Real-time todo statistics
- Filterable todo list
- Input field with placeholder text
- Auto-generated demo todos over time
- Responsive styling with different colors for completed items

---

### 3. Registration Form (`form.ts`)

A comprehensive user registration form with real-time validation and theming.

**Features demonstrated:**

- Complex form validation with computed signals
