import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { evaluateDocument, libraryFromDocuments, parseOpisYaml } from "./index.ts";
import { isObject } from "./expressions.ts";
import type { Json, OpisDocument } from "./types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const examplesDir = join(root, "examples");
const yaml = readFileSync(join(examplesDir, "Button.opis.yaml"), "utf8");
const tokens = {
  core: JSON.parse(readFileSync(join(examplesDir, "core.tokens.json"), "utf8")),
};
const doc = parseOpisYaml(yaml);

function loadLibrary() {
  const docs: OpisDocument[] = [];
  for (const file of readdirSync(examplesDir)) {
    if (!file.endsWith(".opis.yaml")) continue;
    docs.push(parseOpisYaml(readFileSync(join(examplesDir, file), "utf8")));
  }
  return libraryFromDocuments(docs);
}

const library = loadLibrary();

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
    expect(result.diagnostics.map((item) => item.message)).toContain(
      "label is required when kind is text",
    );
    expect(result.instance.tree).toBeNull();
  });

  it("rejects icon buttons without an icon", () => {
    const result = evalButton({ kind: "icon" });
    expect(result.diagnostics.map((item) => item.message)).toContain(
      "Not allowed: kind is icon and icon is not supplied",
    );
  });

  it("returns a diagnostic for an inexhaustive match instead of throwing", () => {
    const extended = structuredClone(doc);
    extended.arguments!.size.values!.push("xxlarge");
    const result = evaluateDocument(
      extended,
      { kind: "text", size: "xxlarge", label: "Continue" },
      tokens,
    );
    expect(result.instance.tree).toBeNull();
    expect(
      result.diagnostics.some((item) => item.message.includes("inexhaustive match")),
    ).toBe(true);
  });

  it("lets comma-separated match arms share a value", () => {
    const shared = {
      ...doc,
      arguments: {
        size: {
          type: "enum" as const,
          values: ["small", "medium", "large", "xlarge"],
          default: "medium",
        },
      },
      constraints: [],
      structure: {
        id: "root",
        type: "stack",
        height: {
          match: {
            on: "$arguments.size",
            cases: {
              small: { mode: "fixed", value: "32px" },
              medium: { mode: "fixed", value: "40px" },
              "large, xlarge": { mode: "fixed", value: "48px" },
            },
          },
        },
      },
    };

    const large = evaluateDocument(shared, { size: "large" }, tokens);
    const xlarge = evaluateDocument(shared, { size: "xlarge" }, tokens);
    expect(isObject(large.painted) && large.painted.height).toEqual({
      mode: "fixed",
      value: "48px",
    });
    expect(isObject(xlarge.painted) && xlarge.painted.height).toEqual({
      mode: "fixed",
      value: "48px",
    });
  });

  it("evaluates every example document with its defaults", () => {
    const files = readdirSync(examplesDir)
      .filter((file) => file.endsWith(".opis.yaml"))
      .map((file) => file.replace(/\.opis\.yaml$/, ""));
    for (const name of files) {
      const example =
        library[`com.example/${name}`] ??
        parseOpisYaml(readFileSync(join(examplesDir, `${name}.opis.yaml`), "utf8"));
      const args: Record<string, Json> =
        name === "Button" ? { label: "Continue" } : {};
      const result = evaluateDocument(example, args, tokens, {}, { library });
      const errors = result.diagnostics.filter((item) => item.level === "error");
      expect(errors, name).toEqual([]);
      expect(result.painted, name).toBeTruthy();
    }
  });

  it("embeds nested OPIS components instead of stubs", () => {
    const card = library["com.example/Card"];
    const result = evaluateDocument(card, { actionLabel: "Open" }, tokens, {}, { library });
    const tree = result.instance.tree as { [key: string]: Json };
    const children = tree.children as Array<{ [key: string]: Json }>;
    const action = children.find((child) => child.id === "action");
    expect(action?.type).toBe("instance");
    expect(action?.component).toBe("com.example/Button");
    const painted = Array.isArray(action?.children) ? action.children[0] : null;
    expect(isObject(painted) && painted.type).toBe("stack");
  });

  it("embeds comments recursively from collection data", () => {
    const thread = library["com.example/CommentThread"];
    const result = evaluateDocument(thread, { seed: "nested" }, tokens, {}, { library });
    const instances: string[] = [];
    walk(result.instance.tree, (node) => {
      if (node.type === "instance" && typeof node.component === "string") {
        instances.push(node.component);
      }
    });
    expect(instances.filter((id) => id === "com.example/Comment")).toHaveLength(3);
    expect(instances).toContain("com.example/Avatar");
  });

  it("expands modal action collections into component children", () => {
    const modal = library["com.example/Modal"];
    const result = evaluateDocument(modal, {}, tokens, {}, { library });
    expect(result.diagnostics.filter((item) => item.level === "error")).toEqual([]);
    const tree = result.instance.tree as { [key: string]: Json };
    const children = tree.children as Array<{ [key: string]: Json }>;
    const actions = children.find((child) => child.id === "actions");
    expect(actions?.type).toBe("collection");
    expect(actions?.axis).toBe("horizontal");
    const items = Array.isArray(actions?.children) ? actions.children : [];
    expect(items).toHaveLength(2);
    expect(isObject(items[0]) && items[0].type).toBe("instance");
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

function walk(node: Json, visit: (node: { [key: string]: Json }) => void) {
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visit);
    return;
  }
  if (!isObject(node)) return;
  visit(node);
  for (const value of Object.values(node)) walk(value, visit);
}
