import { parse as parseYaml } from "yaml";
import type { Json, OpisDocument } from "./types.ts";

export function parseOpisYaml(source: string): OpisDocument {
  const doc = parseYaml(source) as Json;
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
    throw new Error("OPIS document must be a YAML object");
  }
  const record = doc as Record<string, Json>;
  if ("conditions" in record) {
    throw new Error("top-level `conditions` is not part of OPIS 0.1");
  }
  if (record.opis == null) {
    throw new Error("missing `opis` version");
  }
  if (record.component == null || typeof record.component !== "object") {
    throw new Error("missing `component` identity");
  }
  if (record.structure == null || typeof record.structure !== "object") {
    throw new Error("missing `structure`");
  }
  return record as OpisDocument;
}

export function canonicalize(doc: OpisDocument): Json {
  return structuredClone(doc) as Json;
}
