import type {
  Alignment,
  Border,
  Color,
  Dimension,
  Distribution,
  Interaction,
  Padding,
  Style,
  StyleDefinition,
} from "./types";

export class StyleBuilder {
  constructor(readonly definition: StyleDefinition = { base: {}, variants: {} }) {}
  protected copy(definition: StyleDefinition): this {
    return new StyleBuilder(definition) as this;
  }
  style(value: Readonly<Style>): this {
    return this.copy({ ...this.definition, base: { ...this.definition.base, ...value } });
  }
  use(...styles: readonly StyleBuilder[]): this {
    let result: this = this;
    for (const value of styles) result = result.merge(value.definition);
    return result;
  }
  private merge(value: StyleDefinition): this {
    const variants = { ...this.definition.variants };
    for (const key of ["focused", "hovered", "pressed", "disabled", "selected"] as const) {
      if (value.variants[key]) variants[key] = { ...variants[key], ...value.variants[key] };
    }
    return this.copy({ base: { ...this.definition.base, ...value.base }, variants });
  }
  private variant(name: Interaction, value: StyleBuilder): this {
    return this.copy({
      ...this.definition,
      variants: {
        ...this.definition.variants,
        [name]: { ...this.definition.variants[name], ...value.definition.base },
      },
    });
  }
  color(foreground: Color | null): this {
    return this.style({ foreground });
  }
  background(background: Color | null): this {
    return this.style({ background });
  }
  bold(bold = true): this {
    return this.style({ bold });
  }
  italic(italic = true): this {
    return this.style({ italic });
  }
  underline(underline = true): this {
    return this.style({ underline });
  }
  faint(faint = true): this {
    return this.style({ faint });
  }
  dim(): this {
    return this.faint();
  }
  width(width: Dimension): this {
    return this.style({ width });
  }
  height(height: Dimension): this {
    return this.style({ height });
  }
  minWidth(minWidth: number): this {
    return this.style({ minWidth });
  }
  maxWidth(maxWidth: number): this {
    return this.style({ maxWidth });
  }
  minHeight(minHeight: number): this {
    return this.style({ minHeight });
  }
  maxHeight(maxHeight: number): this {
    return this.style({ maxHeight });
  }
  fill(): this {
    return this.style({ width: "fill", height: "fill" });
  }
  grow(grow = 1): this {
    return this.style({ grow });
  }
  shrink(shrink = 1): this {
    return this.style({ shrink });
  }
  gap(gap: number): this {
    return this.style({ gap });
  }
  padding(padding: Padding): this {
    return this.style({ padding });
  }
  border(border: Border): this {
    return this.style({ border });
  }
  borderColor(borderColor: Color | null): this {
    return this.style({ borderColor });
  }
  borderBackground(borderBackground: Color | null): this {
    return this.style({ borderBackground });
  }
  borderTop(borderTop = true): this {
    return this.style({ borderTop });
  }
  borderRight(borderRight = true): this {
    return this.style({ borderRight });
  }
  borderBottom(borderBottom = true): this {
    return this.style({ borderBottom });
  }
  borderLeft(borderLeft = true): this {
    return this.style({ borderLeft });
  }
  justify(justify: Distribution): this {
    return this.style({ justify });
  }
  align(align: Alignment): this {
    return this.style({ align });
  }
  alignSelf(alignSelf: Alignment): this {
    return this.style({ alignSelf });
  }
  position(position: "static" | "absolute"): this {
    return this.style({ position });
  }
  top(top: number): this {
    return this.style({ top });
  }
  right(right: number): this {
    return this.style({ right });
  }
  bottom(bottom: number): this {
    return this.style({ bottom });
  }
  left(left: number): this {
    return this.style({ left });
  }
  zIndex(zIndex: number): this {
    return this.style({ zIndex });
  }
  overflow(overflow: "clip" | "visible" | "ellipsis"): this {
    return this.style({ overflow });
  }
  wrap(wrap: "word" | "character" | "none"): this {
    return this.style({ wrap });
  }
  maxLines(maxLines: number): this {
    return this.style({ maxLines });
  }
  focused(value: StyleBuilder): this {
    return this.variant("focused", value);
  }
  hovered(value: StyleBuilder): this {
    return this.variant("hovered", value);
  }
  pressed(value: StyleBuilder): this {
    return this.variant("pressed", value);
  }
  selected(value: StyleBuilder): this {
    return this.variant("selected", value);
  }
  disabled(value: StyleBuilder): this {
    return this.variant("disabled", value);
  }
}
export function style(): StyleBuilder {
  return new StyleBuilder();
}
