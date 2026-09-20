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
): EvaluateResult {
  const canonical = canonicalize(doc);
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

  const tree = evaluateExpression(doc.structure as Json, ctx);
  const ordered = applyOrder(tree);
  const painted = resolveTokens(ordered, tokens);

  return {
    canonical,
    instance: {
      component: doc.component,
      arguments: args,
      tree: ordered,
    },
    painted,
    diagnostics,
  };
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
