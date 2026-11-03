import { expect, test } from "bun:test";

import { column, text } from "../../element/factories";
import { component } from "../../element/node";
import { mounted } from "../components/tree";
import { breadcrumbNodes } from "./breadcrumbs";
import { DebugSelection } from "./selection";

test("selection follows keyed equivalent remounts and clears when the target is removed", () => {
  const root = mounted(column(), null);
  const branch = mounted(column().key("branch"), root);
  const target = mounted(text("Before").key("target"), branch);
  root.children = [branch];
  branch.children = [target];
  const model = new DebugSelection(() => {});
  model.refresh(root);
  model.select(target);
  branch.active = target.active = false;
  const replacement = mounted(column().key("branch"), root);
  const replacedTarget = mounted(text("After").key("target"), replacement);
  replacement.children = [
    mounted(text("Sibling"), replacement),
    replacedTarget,
  ];
  root.children = [replacement];
  model.refresh(root);
  expect(model.selected).toBe(replacedTarget);
  replacedTarget.active = false;
  replacement.children = [];
  model.refresh(root);
  expect(model.selected).toBeUndefined();
});

test("breadcrumbs spend narrow widths on the selected node and nearest ancestors", () => {
  const root = mounted(
    component(function Application() {
      return null;
    })(),
    null,
  );
  const parent = mounted(column(), root);
  const child = mounted(text("Selected"), parent);
  root.children = [parent];
  parent.children = [child];
  const model = new DebugSelection(() => {});
  model.select(child);
  expect(breadcrumbNodes(model, 80)).toEqual([root, parent, child]);
  expect(breadcrumbNodes(model, 20)).toEqual([parent, child]);
  expect(breadcrumbNodes(model, 6)).toEqual([child]);
  expect(breadcrumbNodes(model, 1)).toEqual([child]);
});
