import { style } from "../../index";

export const colors = {
  base: "#101519",
  panel: "#171e24",
  raised: "#202c33",
  edge: "#34434c",
  ink: "#e1e9e8",
  muted: "#91a5ae",
  accent: "#a5edbd",
  amber: "#edc282",
};
export const surface = style()
  .background(colors.panel)
  .border("rounded")
  .borderColor(colors.edge)
  .padding([0, 1]);
export const action = style()
  .color(colors.muted)
  .padding([0, 1])
  .hovered(style().background(colors.raised).color(colors.ink))
  .focused(style().background(colors.raised).color(colors.accent).bold());
export const field = style()
  .background(colors.base)
  .color(colors.ink)
  .border("rounded")
  .borderColor(colors.edge)
  .padding([0, 1])
  .focused(style().borderColor(colors.accent))
  .selected(style().background(colors.accent).color(colors.base));
