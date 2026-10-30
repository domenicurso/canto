import {
  button,
  column,
  createApp,
  input,
  text,
  useState,
  useViewport,
} from "../../../index";

await createApp(
  () => {
    const [count, setCount] = useState(0);
    const viewport = useViewport();
    return column(
      text("Canto tmux session"),
      text("Unicode: 界 🙂 e\u0301"),
      text(`count=${count}`),
      text(`viewport=${viewport.width}x${viewport.height}`),
      input().width(25).autoFocus(),
      button("Increment", () => setCount((value) => value + 1)),
    );
  },
  {
    mode: process.argv[2] === "inline" ? "inline" : "fullscreen",
    debug: false,
  },
).run();
