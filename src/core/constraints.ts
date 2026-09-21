import { caseNames, describePredicate, evalPredicate, isMatchExpr, isObject } from "./expressions.ts";
import { validateProtocolAccepts } from "./protocols.ts";
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
  library?: Record<string, OpisDocument>,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const defs = doc.arguments ?? {};

  validateNodeIds(doc.structure as Json, diagnostics);
  validateMatches(doc, diagnostics);

  for (const [name, def] of Object.entries(defs)) {
    const value = ctx.arguments[name];
    const present = ctx.supplied.has(name) || value != null;

    if (def.type === "enum" && value != null && def.values && !def.values.includes(String(value))) {
      diagnostics.push({
        level: "error",
        message: `invalid enum value for ${name}: ${String(value)}`,
      });
    }

    if (def.type === "component[]") {
      const items = Array.isArray(value) ? value : [];
      const minItems = def.minItems ?? 0;
      if (items.length < minItems) {
        diagnostics.push({
          level: "error",
          message: `${name} must have at least ${minItems} item${minItems === 1 ? "" : "s"}`,
        });
      }
      if (def.maxItems != null && items.length > def.maxItems) {
        diagnostics.push({
          level: "error",
          message: `${name} must have at most ${def.maxItems} item${def.maxItems === 1 ? "" : "s"}`,
        });
      }
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

  validateProtocolAccepts(doc, ctx, library, diagnostics);

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

function validateNodeIds(node: Json, diagnostics: Diagnostic[], seen = new Set<string>()): void {
  if (!isObject(node)) return;
  if (typeof node.type === "string" && typeof node.id === "string") {
    if (seen.has(node.id)) {
      diagnostics.push({
        level: "error",
        message: `duplicate node ID: ${node.id}`,
      });
    } else {
      seen.add(node.id);
    }
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) validateNodeIds(child, diagnostics, seen);
  }
}

function validateMatches(doc: OpisDocument, diagnostics: Diagnostic[]): void {
  visitJson(doc.structure as Json, (value) => {
    if (!isMatchExpr(value)) return;
    const selector = value.match.on;
    if (!selector.startsWith("$arguments.")) return;
    const name = selector.slice("$arguments.".length);
    const def = doc.arguments?.[name];
    if (!def) {
      diagnostics.push({
        level: "error",
        message: `unknown referenced argument: ${name}`,
      });
      return;
    }
    if (def.optional && def.default === undefined) {
      diagnostics.push({
        level: "error",
        message: `${name} is optional without a default and cannot be a match selector`,
      });
    }

    const legal = legalMatchValues(def.type, def.values);
    if (!legal) return;

    const covered = new Set<string>();
    for (const label of Object.keys(value.match.cases)) {
      const names = caseNames(String(label));
      if (names.length === 0) continue;
      for (const arm of names) {
        if (!legal.includes(arm)) {
          diagnostics.push({
            level: "error",
            message: `unknown match arm ${arm} on ${selector}`,
          });
        }
        if (covered.has(arm)) {
          diagnostics.push({
            level: "error",
            message: `${name} value ${arm} appears in more than one match arm`,
          });
        }
        covered.add(arm);
      }
    }

    if (!("else" in value.match)) {
      const missing = legal.filter((item) => !covered.has(item));
      if (missing.length > 0) {
        diagnostics.push({
          level: "error",
          message: `inexhaustive match on ${selector}: missing ${missing.join(", ")}`,
        });
      }
    }
  });
}

function legalMatchValues(type: string, values?: string[]): string[] | null {
  if (type === "enum") return (values ?? []).map((item) => String(item));
  if (type === "boolean") return ["true", "false"];
  return null;
}

function visitJson(value: Json, visit: (item: Json) => void): void {
  visit(value);
  if (Array.isArray(value)) {
    for (const item of value) visitJson(item, visit);
    return;
  }
  if (isObject(value)) {
    for (const item of Object.values(value)) visitJson(item, visit);
  }
}
