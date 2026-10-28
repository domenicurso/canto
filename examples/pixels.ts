import type { CanvasOptions, Element, ElementRef, PixelBuffer } from "../index";

import {
  button,
  canvas,
  column,
  createApp,
  overlay,
  row,
  style,
  text,
  useApp,
  useMemo,
  useRef,
  useState,
} from "../index";
import { pixelArt } from "./pixel-art";

const panel = style()
  .border("rounded")
  .borderColor("#405668")
  .background("#121d29")
  .padding([0, 1]);
const action = style()
  .color("#a5edbd")
  .padding([0, 1])
  .focused(style().background("#294055").bold())
  .hovered(style().background("#294055"));
export function Pixels(): Element {
  const app = useApp();
  const [phase, setPhase] = useState(0);
  const [renderer, setRenderer] = useState<CanvasOptions["renderer"]>("auto");
  const [settings, setSettings] = useState(false);
  const [inspect, setInspect] = useState(false);
  const anchor = useRef<ElementRef | null>(null);
  const pixels = useMemo(() => pixelArt(phase), [phase]);
  return column(
    row(
      text("Pixel canvas").bold().width("fill"),
      button("Renderer", () => setSettings(!settings))
        .use(action)
        .ref((ref) => {
          anchor.current = ref;
        }),
      button("Inspect", () => setInspect(true)).use(action),
      button("Quit", () => app.stop()).use(action),
    ).gap(1),
    text(
      `RGBA data · requested: ${renderer} · automatic: Kitty → Sixel → quadrants`,
    ).color("#a5b8c9"),
    canvas(pixels, { renderer, fit: "contain" }).fill().use(panel),
    row(
      button("Recolor", () => setPhase((value) => value + 0.7)).use(action),
      text("Tab to navigate · Escape dismisses overlays").color("#a5b8c9"),
    ).gap(1),
    settings &&
      rendererMenu(
        () => anchor.current?.rect,
        (value) => {
          setRenderer(value);
          setSettings(false);
        },
        () => setSettings(false),
      ),
    inspect && preview(pixels, renderer, () => setInspect(false)),
  )
    .padding(1)
    .gap(1)
    .fill()
    .background("#0a121b")
    .color("#e2edf6");
}
function rendererMenu(
  anchor: () => ElementRef["rect"] | undefined,
  choose: (renderer: CanvasOptions["renderer"]) => void,
  close: () => void,
): Element {
  return overlay({
    content: column(
      text("Rendering preference").bold(),
      (["auto", "kitty", "sixel", "quadrants"] as const).map((value) =>
        button(value, () => choose(value)).use(action),
      ),
      text("Unsupported native modes use quadrants.").color("#a5b8c9"),
    ).gap(1),
    anchor,
    placement: "bottom-end",
    focus: "first",
    onDismiss: close,
  })
    .width(40)
    .use(panel);
}
function preview(
  pixels: PixelBuffer,
  renderer: CanvasOptions["renderer"],
  close: () => void,
): Element {
  return overlay({
    modal: true,
    onDismiss: close,
    content: column(
      text("Programmatic pixel data").bold(),
      canvas(pixels, { renderer, fit: "cover" }).fill(),
      text("160 × 96 RGBA pixels. No image files or decoder.").selectable(),
      button("Close", close).use(action).autoFocus(),
    )
      .gap(1)
      .fill(),
  })
    .width(60)
    .height(22)
    .use(panel);
}
if (import.meta.main) await createApp(Pixels).run();
