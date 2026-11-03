import type { Mounted } from "../components/tree";
import type { PropertyLine } from "./properties";

import { button, column, input, row, text } from "../../element/factories";
import { component } from "../../element/node";
import { style } from "../../style/builders/builder";
import { useState } from "../components/hooks";
import { debugColors } from "./controls";
import { editProperty } from "./edits";
import { syntaxText } from "./syntax";

interface PropertyProps {
  node: Mounted;
  line: PropertyLine;
  width: number;
  changed: () => void;
}
export const PropertyRow = component((props: PropertyProps) => {
  const { line, node, width } = props;
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  if (line.section)
    return text(line.label)
      .color(debugColors.muted)
      .paddingTop(1)
      .width("fill");
  if (line.value === undefined) return text(line.label).width("fill");
  const value = editing
    ? valueEditor(props, { error, setError, setEditing })
    : button(
        syntaxText(line.value).width("fill").wrap("character"),
        () => line.edit && setEditing(true),
      )
        .focusable(false)
        .width("fill")
        .hovered(
          style().background(
            line.edit ? debugColors.surface : debugColors.background,
          ),
        );
  return row(
    text(line.label)
      .width(Math.min(20, Math.floor((width - 2) * 0.44)))
      .color(debugColors.name)
      .wrap("none")
      .overflow("ellipsis"),
    value,
  )
    .gap(1)
    .width("fill")
    .key(`${node.element.data.kind}:${line.label}`);
});

function valueEditor(
  props: PropertyProps,
  state: {
    error: string;
    setError: (error: string) => void;
    setEditing: (editing: boolean) => void;
  },
) {
  return column(
    input({
      defaultValue: props.line.value ?? "",
      onSubmit: (value) => {
        try {
          editProperty(props.node, props.line.edit ?? "", value);
          state.setError("");
          state.setEditing(false);
          props.changed();
        } catch (error) {
          state.setError(
            error instanceof Error ? error.message : String(error),
          );
        }
      },
    })
      .autoFocus({ select: true })
      .ref((ref) => ref?.focus())
      .onBlur(() => {
        state.setEditing(false);
        state.setError("");
      })
      .width("fill")
      .background(debugColors.active)
      .onKey((event) => {
        if (event.key === "escape") {
          event.preventDefault();
          state.setEditing(false);
          state.setError("");
        }
      }),
    state.error &&
      text(state.error).color("#cf9b9b").wrap("character").width("fill"),
  ).width("fill");
}
