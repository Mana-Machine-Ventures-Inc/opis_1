import { applyDefaults, validateArguments } from "./constraints.ts";
import { evaluateExpression, isObject } from "./expressions.ts";
import { canonicalize } from "./parse.ts";
import { resolveTokens } from "./tokens.ts";
import type {
  Diagnostic,
  Json,
  OpisDocument,
  ResolvedInstance,
  TokenSet,
} from "./types.ts";

export type ComponentLibrary = Record<string, OpisDocument>;

export type EvaluateOptions = {
  library?: ComponentLibrary;
  depth?: number;
};

const MAX_EMBED_DEPTH = 8;

export type EvaluateResult = {
  canonical: Json;
  instance: ResolvedInstance;
  painted: Json;
  diagnostics: Diagnostic[];
};

export function evaluateDocument(
  doc: OpisDocument,
  supplied: Record<string, Json>,
  tokens: TokenSet,
  environment: Record<string, Json> = {},
  options: EvaluateOptions = {},
): EvaluateResult {
  const canonical = canonicalize(doc);
  try {
    const { arguments: args, supplied: suppliedNames } = applyDefaults(doc, supplied);
    const ctx = {
      arguments: args,
      supplied: suppliedNames,
      environment,
    };
    const diagnostics = validateArguments(doc, ctx);
    const errors = diagnostics.filter((item) => item.level === "error");
    if (errors.length > 0) {
      return {
        canonical,
        instance: {
          component: doc.component,
          arguments: args,
          tree: null,
        },
        painted: null,
        diagnostics,
      };
    }

    const tree = expandStructure(evaluateExpression(doc.structure as Json, ctx));
    const ordered = applyOrder(tree);
    const nested = instantiateComponents(ordered, tokens, environment, options, diagnostics);
    const painted = resolveTokens(nested, tokens);
    return {
      canonical,
      instance: {
        component: doc.component,
        arguments: args,
        tree: nested,
      },
      painted,
      diagnostics,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      canonical,
      instance: {
        component: doc.component,
        arguments: supplied,
        tree: null,
      },
      painted: null,
      diagnostics: [{ level: "error", message }],
    };
  }
}

export function libraryFromDocuments(docs: OpisDocument[]): ComponentLibrary {
  const library: ComponentLibrary = {};
  for (const doc of docs) {
    if (doc.component?.id) library[doc.component.id] = doc;
  }
  return library;
}

function instantiateComponents(
  node: Json,
  tokens: TokenSet,
  environment: Record<string, Json>,
  options: EvaluateOptions,
  diagnostics: Diagnostic[],
): Json {
  if (Array.isArray(node)) {
    return node.map((item) => instantiateComponents(item, tokens, environment, options, diagnostics));
  }
  if (!isObject(node)) return node;

  const next: { [key: string]: Json } = {};
  for (const [key, value] of Object.entries(node)) {
    next[key] = instantiateComponents(value, tokens, environment, options, diagnostics);
  }

  if (next.type === "slot" && isComponentRef(next.source)) {
    const embedded = embedComponent(next.source, next, tokens, environment, options, diagnostics);
    if (embedded) next.source = embedded;
  }

  if (next.type === "component" && typeof next.component === "string") {
    const embedded = embedComponent(next, next, tokens, environment, options, diagnostics);
    if (embedded) return embedded;
  }

  return next;
}

function isComponentRef(value: Json | undefined): value is { [key: string]: Json } {
  return isObject(value) && typeof value.component === "string";
}

function embedComponent(
  ref: { [key: string]: Json },
  host: { [key: string]: Json },
  tokens: TokenSet,
  environment: Record<string, Json>,
  options: EvaluateOptions,
  diagnostics: Diagnostic[],
): { [key: string]: Json } | null {
  const library = options.library ?? {};
  const id = String(ref.component);
  const child = library[id];
  if (!child) return null;

  const depth = options.depth ?? 0;
  if (depth >= MAX_EMBED_DEPTH) {
    diagnostics.push({
      level: "warning",
      message: `stopped embedding ${id} at depth ${MAX_EMBED_DEPTH}`,
    });
    return null;
  }

  const supplied = isObject(ref.arguments) ? ref.arguments : {};
  const result = evaluateDocument(child, supplied, tokens, environment, {
    library,
    depth: depth + 1,
  });
  for (const item of result.diagnostics) diagnostics.push(item);
  if (!isObject(result.painted)) return null;

  const instance: { [key: string]: Json } = {
    type: "instance",
    component: id,
    arguments: supplied,
    children: [result.painted],
  };
  if (typeof host.id === "string") instance.id = host.id;
  for (const key of ["width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight", "hidden", "padding"]) {
    if (host[key] != null) instance[key] = host[key];
  }
  return instance;
}

function applyOrder(node: Json): Json {
  if (Array.isArray(node)) {
    return node.map((item) => applyOrder(item));
  }
  if (!isObject(node)) return node;

  const next: { [key: string]: Json } = {};
  for (const [key, value] of Object.entries(node)) {
    next[key] = applyOrder(value);
  }

  if (Array.isArray(next.children) && Array.isArray(next.order)) {
    const byId = new Map<string, Json>();
    for (const child of next.children) {
      if (isObject(child) && typeof child.id === "string") {
        byId.set(child.id, child);
      }
    }
    next.children = next.order.map((id) => {
      if (typeof id !== "string" || !byId.has(id)) {
        throw new Error(`order references unknown child: ${String(id)}`);
      }
      return byId.get(id)!;
    });
  }

  return next;
}

function expandStructure(node: Json): Json {
  if (Array.isArray(node)) return node.map((item) => expandStructure(item));
  if (!isObject(node)) return node;

  const next: { [key: string]: Json } = {};
  for (const [key, value] of Object.entries(node)) {
    next[key] = expandStructure(value);
  }

  if (isObject(next.layout)) {
    for (const [key, value] of Object.entries(next.layout)) {
      if (next[key] == null) next[key] = value;
    }
  }

  if (next.type === "collection" && Array.isArray(next.source)) {
    const itemLayout = isObject(next.itemLayout) ? next.itemLayout : {};
    const baseId = typeof next.id === "string" ? next.id : "item";
    next.children = next.source.map((item, index) => {
      const child = collectionChild(item, `${baseId}-${index}`);
      for (const [key, value] of Object.entries(itemLayout)) {
        if (child[key] == null) child[key] = value;
      }
      return expandStructure(child);
    });
  }

  return next;
}

function collectionChild(item: Json, fallbackId: string): { [key: string]: Json } {
  if (!isObject(item)) return { type: "component", id: fallbackId, source: item };

  const child: { [key: string]: Json } = { ...item };
  if (typeof child.id !== "string") child.id = fallbackId;
  if (typeof child.type !== "string") {
    child.type = typeof child.component === "string" ? "component" : "stack";
  }
  return child;
}
