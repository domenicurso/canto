import type { Border, Color, Style, TextAlignment, Underline } from "./types";

export abstract class DecorationBuilder {
  abstract style(value: Readonly<Style>): this;
  color(foreground: Color | null): this {
    return this.style({ foreground });
  }
  background(background: Color | null): this {
    return this.style({ background });
  }
  opacity(opacity: number): this {
    return this.style({ opacity });
  }
  bold(bold = true): this {
    return this.style({ bold });
  }
  italic(italic = true): this {
    return this.style({ italic });
  }
  underline(underline: Underline = true): this {
    return this.style({ underline });
  }
  faint(faint = true): this {
    return this.style({ faint });
  }
  dim(): this {
    return this.faint();
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
  underlineColor(underlineColor: Color | null): this {
    return this.style({ underlineColor });
  }
  strikethrough(strikethrough = true): this {
    return this.style({ strikethrough });
  }
  inverse(inverse = true): this {
    return this.style({ inverse });
  }
  textAlign(textAlign: TextAlignment): this {
    return this.style({ textAlign });
  }
  borderTopColor(borderTopColor: Color | null): this {
    return this.style({ borderTopColor });
  }
  borderRightColor(borderRightColor: Color | null): this {
    return this.style({ borderRightColor });
  }
  borderBottomColor(borderBottomColor: Color | null): this {
    return this.style({ borderBottomColor });
  }
  borderLeftColor(borderLeftColor: Color | null): this {
    return this.style({ borderLeftColor });
  }
}
