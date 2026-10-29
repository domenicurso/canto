# Elements and component identity

[API index](README.md) · [Descriptions](../../src/element/node.ts) · [Factories](../../src/element/factories.ts)

## Child and Component

```ts
type Child =
  | Element
  | string
  | number
  | null
  | undefined
  | false
  | readonly Child[];
type Component<P> = (props: P) => Child;
```

Nested arrays flatten recursively. Strings and numbers become text. `null`, `undefined`, and `false` consume no space or gap; `true` isn't a child value.

## component

`component<P = void>(render: Component<P>)` returns a factory that creates an `Element`. The factory requires props unless `P` is `void`, when arguments are optional. Each mounted call owns hooks, effects, and refs. Define factories outside rendering to preserve render-function identity.

```ts
import { button, component, useState } from "canto";

export const Counter = component(({ name }: { name: string }) => {
  const [count, setCount] = useState(0);
  return button(`${name}: ${count}`, () => setCount((n) => n + 1));
});
```

Call `Counter({ name: "Builds" }).key("builds")` in a view. Type and sibling key preserve state through reordering; removal unmounts it. Styles apply to the component's wrapper, which has the normal box model. Plain composition helpers don't create a state boundary.

## Factories

| Factory  | Parameters             | Returns   | Notes           |
| -------- | ---------------------- | --------- | --------------- |
| `text`   | `...content: Child[]`  | `Element` | Text spans only |
| `row`    | `...children: Child[]` | `Element` | Horizontal flow |
| `column` | `...children: Child[]` | `Element` | Vertical flow   |
| `box`    | `...children: Child[]` | `Element` | Vertical flow   |

`text()` joins plain and styled spans and throws for non-text children. `box` uses the same box model as `column`.

`text("Hello ", text("world").bold().color("cyan"))` preserves span appearance. Text defaults to non-selectable; `.selectable()` opts in. Other factories appear under [controls](controls.md), [collections](collections.md), [overlays](overlays.md), and [graphics](graphics.md).

## Element

`Element` extends `StyleBuilder`. Fluent methods return new descriptions; calling `.width(20)` without using its return value doesn't mutate the element.

| Method                    | Argument type                           | Notes                        |
| ------------------------- | --------------------------------------- | ---------------------------- |
| `key`                     | `string \| number`                      | Sibling identity             |
| `onKey`                   | `(event: KeyEvent) => void`             | Bubbles                      |
| `onMouse`                 | `(event: PointerEvent) => void`         |                              |
| `onFocus`, `onBlur`       | `() => void`                            |                              |
| `ref`                     | `(element: ElementRef \| null) => void` | After commit; null on detach |
| `focusable(value = true)` | `boolean`                               |                              |
| `tabIndex`                | `number`                                | Negative: programmatic only  |
| `autoFocus(value = true)` | `boolean`                               |                              |

Buttons, editors, and scroll regions have built-in focus eligibility. See [events and refs](events.md) and [style methods](styles.md).

The exported class also exposes `new Element(data, definition?)`, `.data`, and `.definition`, whose supporting representation types aren't package exports. Prefer factories and fluent methods; raw construction couples applications to renderer internals.
