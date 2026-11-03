import { text } from "../../element/factories";
import { debugColors } from "./controls";

/** Keep quotes and escapes together so strings aren't mistaken for numeric tokens. */
export function syntaxText(value: string) {
  const tokens =
    value.match(
      /"(?:\\.|[^"\\])*"|\b(?:true|false|null|undefined)\b|-?\b\d+(?:\.\d+)?\b|[^"\d]+?|./g,
    ) ?? [];
  return text(
    tokens.map((token) =>
      text(token).color(
        token.startsWith('"')
          ? debugColors.string
          : /^-?\d/.test(token)
            ? debugColors.number
            : /^(true|false|null|undefined)$/.test(token)
              ? debugColors.literal
              : debugColors.text,
      ),
    ),
  );
}
