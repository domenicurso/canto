# Buttons and editors

[API index](README.md) · [Factories](../../src/element/factories.ts) · [Props](../../src/element/props.ts) · [Input guide](../guides/input.md)

## button and ButtonProps

```ts
button(content: Child, options: ButtonProps | (() => void)): Element
interface ButtonProps {
  onPress: () => void;
  disabled?: boolean;
}
```

The callback shorthand sets `onPress`. A button activates on Enter, Space, or pointer release inside the button that received the press. Disabled buttons don't activate. Labels can contain composed children; their text doesn't participate in plain selection. Supply appearance through fluent methods and interaction styles.

## input, textarea, and InputProps

```ts
input(props?: InputProps): Element
textarea(props?: InputProps): Element
```

Both default to empty uncontrolled editors. Value modes are mutually exclusive:

| Mode         | Required            | Optional                                   | Excludes       |
| ------------ | ------------------- | ------------------------------------------ | -------------- |
| Controlled   | `value`, `onChange` | Common options                             | `defaultValue` |
| Uncontrolled | —                   | `defaultValue`, `onChange`, common options | `value`        |

| Property      | Type                      | Default | Notes                       |
| ------------- | ------------------------- | ------- | --------------------------- |
| `placeholder` | `string`                  | —       | Shown when empty            |
| `disabled`    | `boolean`                 | `false` | Disables interaction        |
| `readOnly`    | `boolean`                 | `false` | Selection remains available |
| `onSubmit`    | `(value: string) => void` | —       | Single-line input only      |

`value` and `defaultValue` are strings; `onChange` has type `(value: string) => void`.

Textareas insert newlines on Enter rather than submitting. Controlled handlers publish accepted values through state. `defaultValue` seeds state on mount rather than continually controlling the editor.

```ts
import { column, input, textarea, useState } from "canto";

export function Draft() {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  return column(
    input({
      value: title,
      onChange: setTitle,
      placeholder: "Title",
    }).autoFocus(),
    textarea({ value: notes, onChange: setNotes }).width("fill").height(6),
  ).gap(1);
}
```

Editors preserve graphemes, support bracketed paste, and follow the caret. Inputs have a horizontal editing window; textareas wrap and scroll visible lines. The [input guide](../guides/input.md) lists word, line, document, paragraph, and clipboard shortcuts.

`.selected(style())` changes selection appearance; `.placeholder(style())` changes placeholder appearance, including clearing default faint with `.faint(false)`. These styles don't allocate boxes. `.onKey()` can prevent default editing, submission, activation, or clipboard actions.
