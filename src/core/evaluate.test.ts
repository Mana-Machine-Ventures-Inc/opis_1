import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { evaluateDocument, parseOpisYaml } from "./index.ts";
import { isObject } from "./expressions.ts";
import type { Json } from "./types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const yaml = readFileSync(join(root, "examples/Button.opis.yaml"), "utf8");
const tokens = {
  core: JSON.parse(readFileSync(join(root, "examples/core.tokens.json"), "utf8")),
};
const doc = parseOpisYaml(yaml);

function evalButton(args: Record<string, Json>) {
  return evaluateDocument(doc, args, tokens);
}

function treeOf(args: Record<string, Json>) {
  const result = evalButton(args);
  expect(result.diagnostics.filter((d) => d.level === "error")).toEqual([]);
  expect(isObject(result.instance.tree)).toBe(true);
  return result.instance.tree as { [key: string]: Json };
}

function paintedOf(args: Record<string, Json>) {
  const result = evalButton(args);
  expect(result.diagnostics.filter((d) => d.level === "error")).toEqual([]);
  return result.painted as { [key: string]: Json };
}

describe("Button evaluation", () => {
  it("lets independent axes compose", () => {
    const tree = treeOf({
      kind: "text",
      size: "large",
      tone: "destructive",
      label: "Delete",
    });

    expect(tree.height).toEqual({
      mode: "fixed",
      value: "{core.control.height.large}",
    });
    expect(isObject(tree.style) && tree.style.background).toBe(
      "{core.color.action.destructive}",
    );
  });

  it("nests kind × size only on width", () => {
    const smallIcon = treeOf({
      kind: "icon",
      size: "small",
      icon: { component: "com.example/Icon" },
    });
    const largeIcon = treeOf({
      kind: "icon",
      size: "large",
      icon: { component: "com.example/Icon" },
    });

    expect(smallIcon.width).toEqual({
      mode: "fixed",
      value: "{core.control.height.small}",
    });
    expect(largeIcon.width).toEqual({
      mode: "fixed",
      value: "{core.control.height.large}",
    });
    expect(smallIcon.gap).toBe(0);
    const smallChildren = smallIcon.children;
    expect(Array.isArray(smallChildren)).toBe(true);
    const label = (smallChildren as Json[])[1];
    expect(isObject(label) && label.hidden).toBe(true);
  });

  it("reorders children from the order property", () => {
    const tree = treeOf({
      kind: "text",
      label: "Next",
      icon: { component: "com.example/Icon" },
      iconPosition: "trailing",
    });
    const ids = (tree.children as Array<{ id: string }>).map((child) => child.id);
    expect(ids).toEqual(["label", "icon"]);
  });

  it("rejects text buttons without a label", () => {
    const result = evalButton({ kind: "text" });
    expect(result.diagnostics.some((d) => d.level === "error")).toBe(true);
    expect(result.instance.tree).toBeNull();
  });

  it("rejects icon buttons without an icon", () => {
    const result = evalButton({ kind: "icon" });
    expect(result.diagnostics.some((d) => d.level === "error")).toBe(true);
  });

  it("resolves tokens for the renderer", () => {
    const painted = paintedOf({
      kind: "text",
      size: "medium",
      tone: "primary",
      label: "Continue",
    });
    expect(painted.height).toEqual({ mode: "fixed", value: "40px" });
    expect(isObject(painted.style) && painted.style.background).toBe("#2563eb");
  });
});
