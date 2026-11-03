import type { CanvasOptions } from "../../element/graphics/pixels";
import type { GraphicsCapabilities } from "../../terminal/capabilities/graphics";

export function rasterRenderer(
  requested: CanvasOptions["renderer"],
  capabilities?: GraphicsCapabilities,
): "kitty" | "sixel" | undefined {
  if (requested === "quadrants") return undefined;
  if (capabilities?.kitty && requested !== "sixel") return "kitty";
  if (capabilities?.sixel && requested !== "kitty") return "sixel";
  return undefined;
}
