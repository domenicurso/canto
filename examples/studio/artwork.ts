import {
  button,
  canvas,
  column,
  component,
  overlay,
  text,
  useState,
} from "../../index";
import { pixelArt } from "../pixel-art";
import { action, colors, surface } from "./theme";

const artwork = pixelArt();
export const Artwork = component(() => {
  const [open, setOpen] = useState(false);
  const close = (): void => setOpen(false);
  return column(
    button("Artwork", () => setOpen(true)).use(action),
    open &&
      overlay({
        modal: true,
        onDismiss: close,
        content: column(
          text("Release artwork").bold().color(colors.accent),
          canvas(artwork).fill(),
          text(
            "Procedural RGBA canvas · native graphics with quadrant fallback",
          ).color(colors.muted),
          button("Close preview", close).use(action).autoFocus(),
        )
          .gap(1)
          .fill(),
      })
        .width(76)
        .height(26)
        .use(surface),
  );
});
