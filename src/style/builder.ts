import type { Interaction, Style, StyleDefinition, StylePart } from "./types";

import { mergeDefinitions, nestDefinition } from "./definitions";
import { LayoutBuilder } from "./layout-builder";

export class StyleBuilder extends LayoutBuilder {
  constructor(
    readonly definition: StyleDefinition = { base: {}, variants: {} },
  ) {
    super();
  }
  protected copy(definition: StyleDefinition): this {
    return new StyleBuilder(definition) as this;
  }
  style(value: Readonly<Style>): this {
    return this.copy({
      ...this.definition,
      base: { ...this.definition.base, ...value },
    });
  }
  use(...styles: readonly StyleBuilder[]): this {
    return this.copy(
      styles.reduce(
        (definition, value) => mergeDefinitions(definition, value.definition),
        this.definition,
      ),
    );
  }
  private variant(name: Interaction, value: StyleBuilder): this {
    return this.copy(
      mergeDefinitions(this.definition, nestDefinition(name, value.definition)),
    );
  }
  private part(name: StylePart, value: StyleBuilder): this {
    const parts = this.definition.parts;
    return this.copy({
      ...this.definition,
      parts: {
        ...parts,
        [name]: mergeDefinitions(
          parts?.[name] ?? { base: {}, variants: {} },
          value.definition,
        ),
      },
    });
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
  placeholder(value: StyleBuilder): this {
    return this.part("placeholder", value);
  }
  scrollbarThumb(value: StyleBuilder): this {
    return this.part("scrollbarThumb", value);
  }
  scrollbarTrack(value: StyleBuilder): this {
    return this.part("scrollbarTrack", value);
  }
}
export function style(): StyleBuilder {
  return new StyleBuilder();
}
