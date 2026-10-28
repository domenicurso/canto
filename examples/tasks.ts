import {
  button,
  column,
  component,
  createApp,
  input,
  row,
  scroll,
  style,
  text,
  useApp,
  useState,
} from "../index";

interface Task {
  id: number;
  title: string;
}
const action = style().color("cyan").focused(style().background("#164e63").bold());
const TaskRow = component(({ task, remove }: { task: Task; remove: (id: number) => void }) => {
  const [done, setDone] = useState(false);
  return row(
    button(done ? "[✓]" : "[ ]", () => setDone(!done)).use(action),
    text(task.title)
      .color(done ? "green" : "white")
      .width("fill"),
    button("Remove", () => remove(task.id)).use(action),
  )
    .gap(2)
    .width("fill");
});
export function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, title: "Try a keyed component" },
    { id: 2, title: "Reverse the rows without losing checked state" },
  ]);
  const [nextId, setNextId] = useState(3);
  const [draft, setDraft] = useState("");
  const app = useApp();
  const add = (): void => {
    if (!draft.trim()) return;
    setTasks((previous) => [...previous, { id: nextId, title: draft.trim() }]);
    setNextId(nextId + 1);
    setDraft("");
  };
  const remove = (id: number): void =>
    setTasks((previous) => previous.filter((task) => task.id !== id));
  return column(
    text("Tasks · keyed local state").bold(),
    row(
      input({
        value: draft,
        onChange: setDraft,
        onSubmit: add,
        placeholder: "New task; Enter to add",
      })
        .width("fill")
        .autoFocus(),
      button("Add", add).use(action),
    ).gap(2),
    scroll(
      column(tasks.map((task) => TaskRow({ task, remove }).key(task.id)))
        .gap(1)
        .width("fill"),
    )
      .height("fill")
      .width("fill"),
    row(
      button("Reverse", () => setTasks((previous) => previous.toReversed())).use(action),
      button("Quit", () => app.stop()).use(action),
    ).gap(2),
    text(`${tasks.length} tasks · Check an item, then reverse the list.`).dim(),
  )
    .gap(1)
    .padding(1)
    .fill();
}

if (import.meta.main) await createApp(Tasks).run();
