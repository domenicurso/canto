import { expect, test } from "bun:test";

import { button, column, input, scroll, text } from "../../element/factories";
import { component } from "../../element/node";
import { mounted } from "../components/tree";
import { editProperty, hasEdits, resetProperties } from "./edits";
import { jsonEditSource, parseCompatibleJSON } from "./json-values";
import { propertyLines } from "./properties";

test("geometry, padding, borders and gaps edit independently and reset individually", () => {
  const node = mounted(column().padding(2).gap(1), null);
  node.layout.rect = { x: 4, y: 5, width: 30, height: 10 };
  node.layout.inner = { x: 6, y: 7, width: 26, height: 6 };
  for (const [key, value] of [
    ["layout.x", "8"],
    ["layout.width", "40"],
    ["content.height", "12"],
    ["paddingTop", "3"],
    ["box.borderLeft", "1"],
    ["box.borderRight", "1"],
    ["rowGap", "2"],
    ["columnGap", "4"],
  ])
    editProperty(node, key ?? "", value ?? "");
  expect(node.element.definition.base).toMatchObject({
    translateX: 4,
    width: 40,
    height: 16,
    paddingTop: 3,
    border: "single",
    borderLeft: true,
    borderRight: true,
    borderTop: false,
    borderBottom: false,
    rowGap: 2,
    columnGap: 4,
  });
  resetProperties(node, "box.borderLeft");
  expect(node.element.definition.base.borderLeft).toBe(false);
  expect(node.element.definition.base.borderRight).toBe(true);
  expect(hasEdits(node, "box.borderLeft")).toBe(false);
  expect(hasEdits(node, "rowGap")).toBe(true);
  expect(() => editProperty(node, "box.borderTop", "2")).toThrow();
  resetProperties(node, "paddingTop");
  expect(node.element.definition.base.paddingTop).toBeUndefined();
  expect(node.element.definition.base.padding).toBe(2);
});

test("native prop overrides preserve the latest callbacks when the application rerenders", () => {
  let calls = 0;
  const node = mounted(
    button("Run", () => {
      calls++;
    }),
    null,
  );
  editProperty(node, "props.button.disabled", "true");
  const next = button("Run", () => {
    calls += 10;
  });
  node.element = node.descriptionOverride?.(next) ?? next;
  expect(node.element.data.props.button?.disabled).toBe(true);
  node.element.data.props.button?.onPress();
  expect(calls).toBe(10);
  resetProperties(node, "props.button.disabled");
  expect(node.element.data.props.button?.disabled).toBeUndefined();
  node.element.data.props.button?.onPress();
  expect(calls).toBe(20);
});

test("component props render edited values and retain the component name", () => {
  const Card = component(function Card(props: { count: number }) {
    return text(String(props.count));
  });
  const node = mounted(Card({ count: 1 }), null);
  editProperty(node, "component.count", "5");
  expect(node.element.data.call?.name).toBe("Card");
  expect(node.element.data.call?.props).toEqual({ count: 5 });
  expect(node.element.data.call?.render()).toEqual(text("5"));
  resetProperties(node, "component.count");
  expect(node.element.data.call?.props).toEqual({ count: 1 });
  expect(component(() => null, { name: "Named" })().data.call?.name).toBe(
    "Named",
  );
});

test("hook, input and scroll state use their owned setters and reset their original values", () => {
  const node = mounted(input({ defaultValue: "Hello" }), null);
  const hook = {
    kind: "state" as const,
    value: 3,
    setter: (value: unknown) => {
      hook.value = Number(value);
    },
  };
  node.component.hooks.push(hook);
  editProperty(node, "state.hook.0", "9");
  expect(hook.value).toBe(9);
  resetProperties(node, "state.hook.0");
  expect(hook.value).toBe(3);
  editProperty(node, "state.editor.value", '"World"');
  editProperty(node, "state.editor.cursor", "4");
  expect(node.editor.value).toBe("World");
  expect(node.editor.cursor).toBe(4);
  expect(() => editProperty(node, "state.editor.cursor", "8")).toThrow();
  resetProperties(node, "state.editor.value");
  expect(node.editor.value).toBe("Hello");
  const viewport = mounted(scroll(text("Rows"), { axis: "both" }), null);
  viewport.scrolling.maxOffsetX = 20;
  viewport.scrolling.maxOffset = 20;
  editProperty(viewport, "state.scroll.y", "10");
  expect(viewport.scrolling.offset).toBe(10);
  editProperty(viewport, "state.scroll.x", "5");
  resetProperties(viewport, "state.scroll.y");
  expect(viewport.scrolling.offset).toBe(0);
  expect(viewport.scrolling.offsetX).toBe(5);
});

test("editable JSON never evaluates accessors or toJSON and rejects incompatible values", () => {
  let calls = 0;
  const value = {
    get unsafe() {
      calls++;
      return 1;
    },
  };
  expect(jsonEditSource(value)).toBeUndefined();
  expect(
    jsonEditSource({
      toJSON() {
        calls++;
        return 1;
      },
    }),
  ).toBeUndefined();
  const cycle: { self?: object } = {};
  cycle.self = cycle;
  expect(jsonEditSource(cycle)).toBeUndefined();
  expect(calls).toBe(0);
  const sparse = Array<number>(3);
  sparse[0] = 1;
  sparse[2] = 3;
  expect(jsonEditSource(sparse)).toBe("[1,null,3]");
  expect(
    jsonEditSource(Array.from({ length: 500 }, () => [1, 2, 3])),
  ).toBeUndefined();
  expect(() => parseCompatibleJSON("null", {})).toThrow();
  expect(() => parseCompatibleJSON("{}", [])).toThrow();
  expect(() => parseCompatibleJSON('"3"', 3)).toThrow();
  expect(parseCompatibleJSON("[1,2]", [])).toEqual([1, 2]);
});

test("property groups omit empty sections and geometry omits redundant dimensions", () => {
  const node = mounted(text("Hi"), null);
  const state = propertyLines(node, "State");
  expect(
    state.some((line) => ["Hooks", "Editor", "Scroll"].includes(line.label)),
  ).toBe(false);
  const style = propertyLines(node, "Styles");
  expect(
    style.some((line) =>
      ["Declared", "Variants", "Parts"].includes(line.label),
    ),
  ).toBe(false);
  const layout = propertyLines(node, "Layout");
  expect(
    layout.some((line) =>
      ["contentWidth", "contentHeight"].includes(line.label),
    ),
  ).toBe(false);
  expect(layout.filter((line) => line.label === "width")).toHaveLength(1);
});
