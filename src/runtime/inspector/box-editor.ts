import type { Mounted } from "../components/tree";

import { column, input, row, text } from "../../element/factories";
import { component } from "../../element/node";
import { useState } from "../components/hooks";
import { debugButton, debugColors } from "./controls";
import { editProperty, hasEdits, resetProperties } from "./edits";

export interface BoxTarget {
  key: string;
  label: string;
  value: number;
}
interface EditorProps {
  node: Mounted;
  target: BoxTarget;
  close: () => void;
  changed: () => void;
}
export const BoxEditor = component(function BoxEditor({
  node,
  target,
  close,
  changed,
}: EditorProps) {
  const [error, setError] = useState("");
  return column(
    row(text(target.label).width("fill"), debugButton("Cancel", close)).width(
      "fill",
    ),
    input({
      defaultValue: String(target.value),
      onSubmit: (source) => {
        try {
          editProperty(node, target.key, source);
          changed();
          close();
        } catch (failure) {
          setError(
            failure instanceof Error ? failure.message : String(failure),
          );
        }
      },
    })
      .width("fill")
      .autoFocus({ select: true })
      .background(debugColors.active),
    error && text(error).wrap("word").color("#cf9b9b").width("fill"),
    hasEdits(node, target.key) &&
      debugButton("Reset property", () => {
        resetProperties(node, target.key);
        changed();
        close();
      }),
  )
    .padding(1)
    .width("fill")
    .gap(1)
    .background(debugColors.surface)
    .color(debugColors.text);
});
