import { expect, test } from "bun:test";

import { text } from "../../element/factories";
import { mounted } from "../components/tree";
import { parseStyleEdit } from "./edit-values";
import { applyInspectorEdits, editProperty, resetProperties } from "./edits";

test("style editing validates units, enums, colors, and padding before applying", () => {
  expect(parseStyleEdit("width", '"50%"')).toEqual({ width: "50%" });
  expect(parseStyleEdit("padding", "[1,2,3,4]")).toEqual({
    padding: [1, 2, 3, 4],
  });
  expect(parseStyleEdit("foreground", '"brightRed"')).toEqual({
    foreground: "brightRed",
  });
  for (const [key, value] of [
    ["opacity", "2"],
    ["gap", "-1"],
    ["padding", "[1,-2]"],
    ["padding", "[1]"],
    ["foreground", '"madeup"'],
    ["width", '"wide"'],
    ["justify", '"invalid"'],
    ["onPress", "null"],
  ])
    expect(() => parseStyleEdit(key ?? "", value ?? "")).toThrow();
});

test("mounted overrides survive replacement descriptions and reset to the latest application value", () => {
  const original = text("First").color("red");
  const node = mounted(original, null);
  editProperty(node, "foreground", '"blue"');
  editProperty(node, "text", '"Edited"');
  applyInspectorEdits(node);
  expect(node.element.definition.base.foreground).toBe("blue");
  expect(node.element.data.text).toBe("Edited");
  expect(original.data.text).toBe("First");
  node.element = text("Second").color("green");
  applyInspectorEdits(node);
  expect(node.element.data.text).toBe("Edited");
  resetProperties(node);
  expect(node.element.data.text).toBe("Second");
  expect(node.element.definition.base.foreground).toBe("green");
});
