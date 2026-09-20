import { describePredicate, evalPredicate, isObject } from "./expressions.ts";
import type { Diagnostic, Json, OpisDocument, ResolveContext } from "./types.ts";

export function applyDefaults(
  doc: OpisDocument,
  supplied: Record<string, Json>,
): { arguments: Record<string, Json>; supplied: Set<string> } {
  const names = Object.keys(doc.arguments ?? {});
  const explicit = new Set(Object.keys(supplied));
  const merged: Record<string, Json> = {};

  for (const name of names) {
    const def = doc.arguments![name];
    if (name in supplied) {
      merged[name] = supplied[name];
      continue;
    }
    if (def.default !== undefined) {
      merged[name] = def.default;
      continue;
    }
    if (def.optional) {
      merged[name] = null;
      continue;
    }
    throw new Error(`missing required argument: ${name}`);
  }

  return { arguments: merged, supplied: explicit };
}

export function validateArguments(
  doc: OpisDocument,
  ctx: ResolveContext,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const defs = doc.arguments ?? {};

  for (const [name, def] of Object.entries(defs)) {
    const value = ctx.arguments[name];
    const present = ctx.supplied.has(name) || value != null;

    if (def.type === "enum" && value != null && def.values && !def.values.includes(String(value))) {
      diagnostics.push({
        level: "error",
        message: `invalid enum value for ${name}: ${String(value)}`,
      });
    }

    if (def.availableWhen && ctx.supplied.has(name)) {
      if (!evalPredicate(def.availableWhen, ctx)) {
        diagnostics.push({
          level: "error",
          message: `${name} is only available when ${describePredicate(def.availableWhen)}`,
        });
      }
    }

    if (def.forbiddenWhen && present) {
      if (evalPredicate(def.forbiddenWhen, ctx)) {
        diagnostics.push({
          level: "error",
          message: `${name} is forbidden when ${describePredicate(def.forbiddenWhen)}`,
        });
      }
    }
  }

  for (const constraint of doc.constraints ?? []) {
    if (!isObject(constraint)) continue;

    if ("require" in constraint && isObject(constraint.require)) {
      const req = constraint.require;
      if (evalPredicate(req.when, ctx) && !evalPredicate(req.then, ctx)) {
        diagnostics.push({
          level: "error",
          message: describeRequire(req.when, req.then),
        });
      }
    }

    if ("forbid" in constraint) {
      if (evalPredicate(constraint.forbid, ctx)) {
        diagnostics.push({
          level: "error",
          message: describeForbid(constraint.forbid),
        });
      }
    }
  }

  return diagnostics;
}

function describeRequire(when: Json, then: Json): string {
  if (isObject(then) && typeof then.exists === "string") {
    const name = then.exists.replace("$arguments.", "").replace("$environment.", "environment.");
    return `${name} is required when ${describePredicate(when)}`;
  }
  return `${describePredicate(then)} is required when ${describePredicate(when)}`;
}

function describeForbid(predicate: Json): string {
  return `Not allowed: ${describePredicate(predicate)}`;
}
