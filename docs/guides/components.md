# Components and state

[Documentation](../README.md)

The root and `component()` callbacks are render functions. They may run repeatedly and must stay free of side effects. Hooks must always run in the same order, outside conditionals and loops.

The fragment below assumes imports from `canto` and a `projects` array with `id` and `name` fields.

```ts
const Project = component(({ name }: { name: string }) => {
  const [stars, setStars] = useState(0);
  return button(`${name}: ${stars}`, () => setStars((n) => n + 1));
});

column(
  projects.map((project) => Project({ name: project.name }).key(project.id)),
);
```

`component()` creates a mounted state boundary; a plain helper function only composes descriptions. Define component factories outside render bodies. Stable types and sibling keys preserve state and focus during reordering. Removing a component disposes its state, refs, and effects.

`useState` supports direct values, lazy initialization, and functional updates. Writes coalesce into scheduled frames. Updates to a child component do not execute its unchanged ancestors. `useMemo`, `useRef`, and `useEffect` provide memoization, stable references, and external resource ownership. Effects run after output commits and clean up before replacement or unmount; dependency arrays use `Object.is` comparisons.

See [hook signatures](../api/hooks.md), [element identity](../api/elements.md), and the [effect-driven log viewer](../../examples/logs.ts).
