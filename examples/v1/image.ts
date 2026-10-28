import type { Raster } from "./image-raster";

import {
  canvas,
  column,
  createApp,
  text,
  useEffect,
  useState,
} from "../../index";
import { decodePng, drawRaster, sampleRaster } from "./image-raster";

type ImageState =
  | { kind: "ready"; raster: Raster }
  | { kind: "loading" }
  | { kind: "error"; message: string };
export function Image(path?: string) {
  const [state, setState] = useState<ImageState>(() =>
    path ? { kind: "loading" } : { kind: "ready", raster: sampleRaster() },
  );
  useEffect(() => {
    if (!path) return;
    let active = true;
    void Bun.file(path)
      .bytes()
      .then((bytes) => {
        const raster = decodePng(bytes);
        if (active) setState({ kind: "ready", raster });
      })
      .catch((error: unknown) => {
        if (active)
          setState({
            kind: "error",
            message: error instanceof Error ? error.message : String(error),
          });
      });
    return () => {
      active = false;
    };
  }, [path]);
  return column(
    text("Image · PNG rendered with half-block cells").bold(),
    state.kind === "ready"
      ? canvas((draw) => drawRaster(draw, state.raster))
          .fill()
          .background("black")
      : text(state.kind === "loading" ? "Loading…" : state.message).color(
          "red",
        ),
    text(
      path ?? "Built-in sample · pass a PNG path to display your own image",
    ).dim(),
    text("Transparency is composited over black · Ctrl+C to exit").dim(),
  ).fill();
}
if (import.meta.main) await createApp(() => Image(process.argv[2])).run();
