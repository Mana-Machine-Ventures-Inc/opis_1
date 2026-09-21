import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { evaluateDocument, libraryFromDocuments, parseOpisYaml } from "./index.ts";
import { componentConformsTo, protocolRegistry } from "./protocols.ts";
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
      { kind: "text", size: "medium", label: "Continue" },
      tokens,
    );
    expect(result.instance.tree).toBeNull();
    expect(result.diagnostics.map((item) => item.message)).toContain(
      "inexhaustive match on $arguments.size: missing xxlarge",
    );
  });

  it("rejects unknown and duplicated match arms", () => {
    const unknown = {
      ...doc,
      constraints: [],
      structure: {
        id: "root",
        type: "stack",
        height: {
          match: {
            on: "$arguments.size",
            cases: {
              small: 1,
              medium: 2,
              large: 3,
              xlarge: 4,
              huge: 5,
            },
          },
        },
      },
    };
    const unknownResult = evaluateDocument(unknown, { label: "Continue" }, tokens);
    expect(unknownResult.diagnostics.map((item) => item.message)).toContain(
      "unknown match arm huge on $arguments.size",
    );

    const duplicated = {
      ...doc,
      constraints: [],
      structure: {
        id: "root",
        type: "stack",
        height: {
          match: {
            on: "$arguments.size",
            cases: {
              small: 1,
              medium: 2,
              large: 3,
              "large, xlarge": 4,
            },
          },
        },
      },
    };
    const duplicatedResult = evaluateDocument(duplicated, { label: "Continue" }, tokens);
    expect(duplicatedResult.diagnostics.map((item) => item.message)).toContain(
      "size value large appears in more than one match arm",
    );
  });

  it("rejects duplicate node IDs", () => {
    const duplicate = {
      ...doc,
      constraints: [],
      structure: {
        id: "root",
        type: "stack",
        children: [
          { id: "label", type: "text", content: "A" },
          { id: "label", type: "text", content: "B" },
        ],
      },
    };
    const result = evaluateDocument(duplicate, { label: "Continue" }, tokens);
    expect(result.diagnostics.map((item) => item.message)).toContain("duplicate node ID: label");
  });

  it("enforces collection cardinality", () => {
    const carousel = library["com.example/Carousel"];
    const empty = evaluateDocument(carousel, { items: [] }, tokens, {}, { library });
    expect(empty.diagnostics.map((item) => item.message)).toContain(
      "items must have at least 1 item",
    );

    const modal = library["com.example/Modal"];
    const crowded = evaluateDocument(
      modal,
      {
        actions: [
          { component: "com.example/Button", arguments: { label: "A" } },
          { component: "com.example/Button", arguments: { label: "B" } },
          { component: "com.example/Button", arguments: { label: "C" } },
          { component: "com.example/Button", arguments: { label: "D" } },
        ],
      },
      tokens,
      {},
      { library },
    );
    expect(crowded.diagnostics.map((item) => item.message)).toContain(
      "actions must have at most 3 items",
    );
  });

  it("lets itemLayout override a child's preferred size", () => {
    const shelf: OpisDocument = {
      opis: "0.1",
      component: { id: "com.example/Shelf", name: "Shelf" },
      arguments: {
        items: {
          type: "component[]",
          minItems: 1,
          default: [
            {
              type: "stack",
              width: { mode: "fill" },
            },
          ],
        },
      },
      structure: {
        id: "root",
        type: "collection",
        source: "$arguments.items",
        itemLayout: {
          width: { mode: "fixed", value: 80 },
        },
      },
    };
    const result = evaluateDocument(shelf, {}, tokens);
    expect(result.diagnostics.filter((item) => item.level === "error")).toEqual([]);
    const tree = result.instance.tree as { [key: string]: Json };
    const items = Array.isArray(tree.children) ? tree.children : [];
    expect(isObject(items[0]) && items[0].width).toEqual({ mode: "fixed", value: 80 });
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

  it("paints overlay layers back to front and defaults overflow to clip", () => {
    const hero = library["com.example/HeroTile"];
    const result = evaluateDocument(hero, {}, tokens, {}, { library });
    expect(result.diagnostics.filter((item) => item.level === "error")).toEqual([]);
    const tree = result.instance.tree as { [key: string]: Json };
    expect(tree.type).toBe("overlay");
    expect(tree.overflow).toBe("clip");
    const children = Array.isArray(tree.children) ? tree.children : [];
    expect(children.map((child) => (isObject(child) ? child.id : null))).toEqual([
      "artwork",
      "shield",
      "caption",
    ]);
    expect(isObject(result.painted) && isObject(result.painted.style)).toBe(true);
    const painted = result.painted as { [key: string]: Json };
    const layers = Array.isArray(painted.children) ? painted.children : [];
    const shield = layers.find((layer) => isObject(layer) && layer.id === "shield");
    expect(isObject(shield) && isObject(shield.style) && String(shield.style.background)).toContain(
      "linear-gradient",
    );
  });

  it("lets ContentAlbum satisfy a ContentItem collection", () => {
    const registry = protocolRegistry(Object.values(library));
    expect(componentConformsTo(library["com.example/AlbumTile"], "ContentItem", registry)).toBe(
      true,
    );
    expect(componentConformsTo(library["com.example/ArtistTile"], "ContentItem", registry)).toBe(
      true,
    );
    expect(componentConformsTo(library["com.example/Button"], "ContentItem", registry)).toBe(false);

    const carousel = library["com.example/Carousel"];
    const mixed = evaluateDocument(carousel, {}, tokens, {}, { library });
    expect(mixed.diagnostics.filter((item) => item.level === "error")).toEqual([]);
    const tree = mixed.instance.tree as { [key: string]: Json };
    expect(tree.type).toBe("collection");
    expect(tree.overflow).toBe("scroll");
    const items = Array.isArray(tree.children) ? tree.children : [];
    expect(items.map((item) => (isObject(item) ? item.component : null))).toEqual([
      "com.example/HeroTile",
      "com.example/AlbumTile",
      "com.example/ArtistTile",
      "com.example/AlbumTile",
      "com.example/AlbumTile",
      "com.example/ArtistTile",
      "com.example/AlbumTile",
    ]);

    const rejected = evaluateDocument(
      carousel,
      {
        items: [{ component: "com.example/Button", arguments: { label: "Nope" } }],
      },
      tokens,
      {},
      { library },
    );
    expect(rejected.diagnostics.map((item) => item.message)).toContain(
      "Button does not conform to ContentItem (required by items)",
    );
  });

  it("composes album and artist tiles into carousel, grid, and stack", () => {
    const home = library["com.example/MusicHome"];
    const result = evaluateDocument(home, {}, tokens, {}, { library });
    expect(result.diagnostics.filter((item) => item.level === "error")).toEqual([]);
    const kinds = new Map<string, number>();
    walk(result.instance.tree, (node) => {
      if (node.type === "instance" && typeof node.component === "string") {
        kinds.set(node.component, (kinds.get(node.component) ?? 0) + 1);
      }
    });
    expect(kinds.get("com.example/HeroTile")).toBe(1);
    expect(kinds.get("com.example/Carousel")).toBe(2);
    expect(kinds.get("com.example/ContentGrid")).toBe(1);
    expect(kinds.get("com.example/ContentStack")).toBe(1);
    expect(kinds.get("com.example/AlbumTile")).toBeGreaterThan(4);
    expect(kinds.get("com.example/ArtistTile")).toBeGreaterThan(4);
    expect(kinds.get("com.example/ContentTile")).toBe(
      (kinds.get("com.example/AlbumTile") ?? 0) + (kinds.get("com.example/ArtistTile") ?? 0),
    );
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

  it("keeps text box alignment on the text node", () => {
    const text = library["com.example/Text"];
    const result = evaluateDocument(
      text,
      { align: "end", blockAlign: "center" },
      tokens,
      {},
      { library },
    );
    expect(result.diagnostics.filter((item) => item.level === "error")).toEqual([]);
    const tree = result.instance.tree as { [key: string]: Json };
    expect(tree.type).toBe("text");
    expect(tree.width).toEqual({ mode: "fill" });
    expect(tree.alignment).toEqual({ inline: "end", block: "center" });
  });

  it("preserves structured shadows and fills on StyleGallery", () => {
    const gallery = library["com.example/StyleGallery"];
    const result = evaluateDocument(gallery, {}, tokens, {}, { library });
    expect(result.diagnostics.filter((item) => item.level === "error")).toEqual([]);
    const tree = result.painted as { [key: string]: Json };
    const children = tree.children as Array<{ [key: string]: Json }>;
    const elevation = children.find((child) => child.id === "elevation");
    expect(isObject(elevation?.style) && Array.isArray(elevation.style.shadows)).toBe(true);
    const frost = children.find((child) => child.id === "frost");
    const frostKids = Array.isArray(frost?.children) ? frost.children : [];
    const glass = frostKids.find((child) => isObject(child) && child.id === "frostGlass") as
      | { [key: string]: Json }
      | undefined;
    expect(isObject(glass?.style) && isObject(glass.style.blur)).toBe(true);
    const layerBlur = children.find((child) => child.id === "layerPair");
    const layerCols = Array.isArray(layerBlur?.children) ? layerBlur.children : [];
    const blurCol = layerCols.find((child) => isObject(child) && child.id === "layerBlurCol") as
      | { [key: string]: Json }
      | undefined;
    const blurTile = Array.isArray(blurCol?.children)
      ? blurCol.children.find((child) => isObject(child) && child.id === "layerBlur")
      : undefined;
    expect(isObject(blurTile) && isObject(blurTile.style) && isObject(blurTile.style.blur)).toBe(true);
    const progressive = children.find((child) => child.id === "progressive");
    const progressiveKids = Array.isArray(progressive?.children) ? progressive.children : [];
    const veil = progressiveKids.find((child) => isObject(child) && child.id === "progressiveVeil") as
      | { [key: string]: Json }
      | undefined;
    expect(isObject(veil?.style) && isObject(veil.style.blur) && isObject(veil.style.blur.progressive)).toBe(
      true,
    );
    const maskClip = children.find((child) => child.id === "maskClip");
    const maskKids = Array.isArray(maskClip?.children) ? maskClip.children : [];
    const maskShape = maskKids.find((child) => isObject(child) && child.id === "maskShape") as
      | { [key: string]: Json }
      | undefined;
    expect(maskShape?.mask).toBe(true);
  });
});

describe("Icons", () => {
  it("paints a named icon node from the Icon component", () => {
    const icon = library["com.example/Icon"];
    const result = evaluateDocument(icon, { name: "search" }, tokens, {}, { library });
    expect(result.diagnostics.filter((item) => item.level === "error")).toEqual([]);
    const tree = result.painted as { [key: string]: Json };
    expect(tree.type).toBe("icon");
    expect(tree.name).toBe("search");
    expect(tree.kind).toBe("template");
  });

  it("embeds Icon into SearchField slots", () => {
    const field = library["com.example/SearchField"];
    const result = evaluateDocument(field, { query: "opis" }, tokens, {}, { library });
    expect(result.diagnostics.filter((item) => item.level === "error")).toEqual([]);
    const ids: string[] = [];
    walk(result.painted, (node) => {
      if (node.type === "instance" && typeof node.component === "string") ids.push(node.component);
      if (node.type === "icon" && typeof node.name === "string") ids.push(node.name);
    });
    expect(ids).toContain("com.example/Icon");
    expect(ids).toContain("search");
    expect(ids).toContain("close");
  });

  it("rejects a non-Icon component in a Button icon slot", () => {
    const result = evaluateDocument(
      doc,
      {
        kind: "icon",
        icon: { component: "com.example/AlbumTile" },
      },
      tokens,
      {},
      { library },
    );
    expect(result.diagnostics.map((item) => item.message).join("\n")).toMatch(/does not conform to Icon/);
  });

  it("lets Icon satisfy Button's Icon protocol", () => {
    const result = evaluateDocument(
      doc,
      {
        kind: "icon",
        icon: { component: "com.example/Icon", arguments: { name: "plus" } },
      },
      tokens,
      {},
      { library },
    );
    expect(result.diagnostics.filter((item) => item.level === "error")).toEqual([]);
    const names: string[] = [];
    walk(result.painted, (node) => {
      if (node.type === "icon") names.push(String(node.name));
    });
    expect(names).toContain("plus");
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
