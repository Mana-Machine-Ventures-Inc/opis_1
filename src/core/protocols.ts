import { isObject } from "./expressions.ts";
import type {
  ArgumentDefinition,
  Diagnostic,
  Json,
  OpisDocument,
  ProtocolDefinition,
  ResolveContext,
} from "./types.ts";

export type ProtocolRecord = {
  name: string;
  id?: string;
  conformsTo: string[];
};

export function protocolRegistry(docs: Iterable<OpisDocument>): Map<string, ProtocolRecord> {
  const registry = new Map<string, ProtocolRecord>();
  for (const doc of docs) {
    for (const record of declaredProtocols(doc)) {
      const existing = registry.get(record.name);
      const merged: ProtocolRecord = {
        name: record.name,
        id: record.id ?? existing?.id,
        conformsTo: unique([...(existing?.conformsTo ?? []), ...record.conformsTo]),
      };
      registry.set(record.name, merged);
      if (merged.id) registry.set(merged.id, merged);
    }
  }
  return registry;
}

export function acceptedProtocol(accepts: ArgumentDefinition["accepts"]): string | null {
  if (typeof accepts === "string") return accepts;
  if (isObject(accepts) && typeof accepts.protocol === "string") return accepts.protocol;
  return null;
}

export function componentConformsTo(
  doc: OpisDocument,
  protocol: string,
  registry: Map<string, ProtocolRecord>,
): boolean {
  const seen = new Set<string>();
  const queue = [...(doc.conformsTo ?? [])];
  while (queue.length > 0) {
    const name = queue.shift()!;
    if (seen.has(name)) continue;
    seen.add(name);
    if (name === protocol) return true;
    const record = registry.get(name);
    if (record?.id === protocol) return true;
    if (record) queue.push(...record.conformsTo);
  }
  return false;
}

export function validateProtocolAccepts(
  doc: OpisDocument,
  ctx: ResolveContext,
  library: Record<string, OpisDocument> | undefined,
  diagnostics: Diagnostic[],
): void {
  if (!library) return;
  const registry = protocolRegistry([...Object.values(library), doc]);

  for (const [name, def] of Object.entries(doc.arguments ?? {})) {
    const protocol = acceptedProtocol(def.accepts);
    if (!protocol) continue;
    if (def.type !== "component" && def.type !== "component[]") continue;

    const items = collectionItems(ctx.arguments[name], def.type);
    for (const item of items) {
      if (!isObject(item) || typeof item.component !== "string") {
        diagnostics.push({
          level: "error",
          message: `${name} expects a component that conforms to ${protocol}`,
        });
        continue;
      }

      const child = library[item.component];
      if (!child) continue;
      if (componentConformsTo(child, protocol, registry)) continue;

      const childName = child.component.name ?? item.component;
      diagnostics.push({
        level: "error",
        message: `${childName} does not conform to ${protocol} (required by ${name})`,
      });
    }
  }
}

function collectionItems(value: Json | undefined, type: ArgumentDefinition["type"]): Json[] {
  if (type === "component[]") return Array.isArray(value) ? value : [];
  if (value == null) return [];
  return [value];
}

function declaredProtocols(doc: OpisDocument): ProtocolRecord[] {
  const raw = doc.protocols;
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.flatMap((entry) => {
      if (!isObject(entry)) return [];
      const name = protocolName(entry);
      if (!name) return [];
      return [
        {
          name,
          id: typeof entry.id === "string" ? entry.id : undefined,
          conformsTo: stringList(entry.conformsTo),
        },
      ];
    });
  }
  if (!isObject(raw)) return [];
  return Object.entries(raw).map(([name, entry]) => ({
    name,
    id: isObject(entry) && typeof entry.id === "string" ? entry.id : undefined,
    conformsTo: isObject(entry) ? stringList(entry.conformsTo) : [],
  }));
}

function protocolName(entry: ProtocolDefinition): string | null {
  if (typeof entry.name === "string" && entry.name) return entry.name;
  if (typeof entry.id === "string" && entry.id) {
    const parts = entry.id.split("/");
    return parts[parts.length - 1] || entry.id;
  }
  return null;
}

function stringList(value: Json | undefined): string[] {
  if (typeof value === "string") return [value];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
