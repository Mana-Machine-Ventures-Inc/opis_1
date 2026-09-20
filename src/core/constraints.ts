import { evalPredicate, isObject } from "./expressions.ts";
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
          message: `argument ${name} is not available in this configuration`,
        });
      }
    }

    if (def.forbiddenWhen && present) {
      if (evalPredicate(def.forbiddenWhen, ctx)) {
        diagnostics.push({
          level: "error",
          message: `argument ${name} is forbidden in this configuration`,
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
          message: "required argument combination was not satisfied",
        });
      }
    }

    if ("forbid" in constraint) {
      if (evalPredicate(constraint.forbid, ctx)) {
        diagnostics.push({
          level: "error",
          message: "forbidden argument combination",
        });
      }
    }
  }

  return diagnostics;
}
