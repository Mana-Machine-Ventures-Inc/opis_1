import type { Json, ResolveContext } from "./types.ts";

export function isObject(value: Json | undefined): value is { [key: string]: Json } {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

export function isMatchExpr(
  value: Json,
): value is { match: { on: string; cases: { [key: string]: Json }; else?: Json } } {
  if (!isObject(value) || !isObject(value.match)) return false;
  return typeof value.match.on === "string" && isObject(value.match.cases);
}

export function isIfExpr(
  value: Json,
): value is { if: Json; then: Json; else: Json } {
  return isObject(value) && "if" in value && "then" in value && "else" in value;
}

export function readSelector(selector: string, ctx: ResolveContext): Json {
  if (selector.startsWith("$arguments.")) {
    const name = selector.slice("$arguments.".length);
    return ctx.arguments[name] ?? null;
  }
  if (selector.startsWith("$environment.")) {
    const name = selector.slice("$environment.".length);
    return getPath(ctx.environment, name);
  }
  throw new Error(`unsupported selector: ${selector}`);
}

export function existsSelector(selector: string, ctx: ResolveContext): boolean {
  const value = readSelector(selector, ctx);
  return !isAbsent(value);
}

export function isAbsent(value: Json | undefined): boolean {
  return value == null;
}

export function evalPredicate(predicate: Json, ctx: ResolveContext): boolean {
  if (!isObject(predicate)) {
    throw new Error("predicate must be an object");
  }

  if ("eq" in predicate) return compare(predicate.eq, ctx, (a, b) => a === b);
  if ("neq" in predicate) return compare(predicate.neq, ctx, (a, b) => a !== b);
  if ("exists" in predicate) {
    if (typeof predicate.exists !== "string") {
      throw new Error("`exists` requires a selector string");
    }
    return existsSelector(predicate.exists, ctx);
  }
  if ("not" in predicate) return !evalPredicate(predicate.not, ctx);
  if ("all" in predicate) {
    const items = asArray(predicate.all);
    return items.every((item) => evalPredicate(item, ctx));
  }
  if ("any" in predicate) {
    const items = asArray(predicate.any);
    return items.some((item) => evalPredicate(item, ctx));
  }
  if ("gt" in predicate) return numeric(predicate.gt, ctx, (a, b) => a > b);
  if ("gte" in predicate) return numeric(predicate.gte, ctx, (a, b) => a >= b);
  if ("lt" in predicate) return numeric(predicate.lt, ctx, (a, b) => a < b);
  if ("lte" in predicate) return numeric(predicate.lte, ctx, (a, b) => a <= b);

  throw new Error(`unknown predicate: ${Object.keys(predicate).join(", ")}`);
}

export function evaluateExpression(value: Json, ctx: ResolveContext): Json {
  if (isMatchExpr(value)) {
    const selected = readSelector(value.match.on, ctx);
    const key = selected == null ? "" : String(selected);
    if (key in value.match.cases) {
      return evaluateExpression(value.match.cases[key], ctx);
    }
    if ("else" in value.match) {
      return evaluateExpression(value.match.else ?? null, ctx);
    }
    throw new Error(`inexhaustive match on ${value.match.on}: no arm for ${key}`);
  }

  if (isIfExpr(value)) {
    const passed = evalPredicate(value.if, ctx);
    return evaluateExpression(passed ? value.then : value.else, ctx);
  }

  if (Array.isArray(value)) {
    return value.map((item) => evaluateExpression(item, ctx));
  }

  if (isObject(value)) {
    const out: { [key: string]: Json } = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = evaluateExpression(item, ctx);
    }
    return out;
  }

  if (typeof value === "string" && value.startsWith("$")) {
    return readSelector(value, ctx);
  }

  return value;
}

function asArray(value: Json): Json[] {
  if (!Array.isArray(value)) {
    throw new Error("expected an array");
  }
  return value;
}

function resolveOperand(value: Json, ctx: ResolveContext): Json {
  if (typeof value === "string" && value.startsWith("$")) {
    return readSelector(value, ctx);
  }
  return value;
}

function compare(
  value: Json,
  ctx: ResolveContext,
  op: (a: Json, b: Json) => boolean,
): boolean {
  const pair = asArray(value);
  if (pair.length !== 2) throw new Error("comparison requires two operands");
  return op(resolveOperand(pair[0], ctx), resolveOperand(pair[1], ctx));
}

function numeric(
  value: Json,
  ctx: ResolveContext,
  op: (a: number, b: number) => boolean,
): boolean {
  const pair = asArray(value);
  if (pair.length !== 2) throw new Error("numeric comparison requires two operands");
  const left = toNumber(resolveCount(pair[0], ctx));
  const right = toNumber(resolveCount(pair[1], ctx));
  return op(left, right);
}

function resolveCount(value: Json, ctx: ResolveContext): Json {
  if (isObject(value) && "count" in value && typeof value.count === "string") {
    const selected = readSelector(value.count, ctx);
    return Array.isArray(selected) ? selected.length : 0;
  }
  return resolveOperand(value, ctx);
}

function toNumber(value: Json): number {
  if (typeof value === "number") return value;
  throw new Error(`expected a number, got ${typeof value}`);
}

function getPath(object: Record<string, Json>, path: string): Json {
  const parts = path.split(".");
  let current: Json = object;
  for (const part of parts) {
    if (!isObject(current) || !(part in current)) return null;
    current = current[part];
  }
  return current;
}
