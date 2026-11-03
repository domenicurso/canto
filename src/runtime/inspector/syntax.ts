import { Element } from "../../element/node";
import { debugColors } from "./controls";

/** Group syntax into runs instead of creating an element for each character. */
export function syntaxText(value: string): Element {
  const tokens =
    value.match(
      /"(?:\\.|[^"\\])*"|\b(?:true|false|null|undefined)\b|-?\d+(?:\.\d+)?|[a-zA-Z_$][\w$]*|[^\w"]+|./g,
    ) ?? [];
  const runs = tokens.map((token) => ({
    text: token,
    style: {
      foreground: token.startsWith('"')
        ? debugColors.string
        : /^-?\d/.test(token)
          ? debugColors.number
          : /^(true|false|null|undefined)$/.test(token)
            ? debugColors.literal
            : debugColors.text,
    },
  }));
  return new Element({
    kind: "text",
    text: value,
    runs,
    children: [],
    props: {},
  });
}
