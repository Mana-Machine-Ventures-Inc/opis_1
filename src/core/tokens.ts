import { isObject } from "./expressions.ts";
import type { Json, TokenSet } from "./types.ts";

const TOKEN_REF = /^\{([^{}]+)\}$/;

export function resolveTokens(value: Json, tokens: TokenSet): Json {
  if (typeof value === "string") {
    return resolveTokenString(value, tokens);
  }
  if (Array.isArray(value)) {
    return value.map((item) => resolveTokens(item, tokens));
  }
  if (isObject(value)) {
    const out: { [key: string]: Json } = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = resolveTokens(item, tokens);
    }
    return out;
  }
  return value;
}

export function resolveTokenString(value: string, tokens: TokenSet): Json {
  const match = value.match(TOKEN_REF);
  if (!match) return value;
  const path = match[1].split(".");
  const namespace = path.shift();
  if (!namespace) throw new Error(`invalid token reference: ${value}`);
  const doc = tokens[namespace];
  if (doc == null) throw new Error(`unknown token namespace: ${namespace}`);
  let current: Json = doc;
  for (const part of path) {
    if (!isObject(current) || !(part in current)) {
      throw new Error(`unknown token: ${value}`);
    }
    current = current[part];
  }
  if (isObject(current) && "$value" in current) {
    return current.$value;
  }
  return current;
}
