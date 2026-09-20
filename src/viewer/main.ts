import tokenSource from "../../examples/core.tokens.json?raw";
import { evalPredicate } from "../core/expressions.ts";
import { evaluateDocument, libraryFromDocuments, parseOpisYaml } from "../core/index.ts";
import type { ArgumentDefinition, Json, OpisDocument, TokenSet } from "../core/types.ts";
import { renderNode } from "../render/html.ts";

const yamlModules = import.meta.glob("../../examples/*.opis.yaml", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

const catalog = catalogFromGlob(yamlModules);
const exampleNames = Object.keys(catalog).sort((a, b) => {
  if (a === "Button") return -1;
  if (b === "Button") return 1;
  return a.localeCompare(b);
});

let selectedExample = exampleNames.includes("Button") ? "Button" : exampleNames[0];
let source = catalog[selectedExample] ?? "";
let tokensText = tokenSource;
let tokenSet: TokenSet = { core: JSON.parse(tokenSource) as Json };
let lastGoodTokens = tokenSet;
let irTab: "canonical" | "resolved" | "painted" = "resolved";
let lastGood: OpisDocument = parseOpisYaml(source);
let supplied: Record<string, Json> = seedSupplied(lastGood);
let lastArgSignature = "";
let ignoreHmr: Set<string> = new Set();
let pendingSave: { kind: "yaml" | "tokens"; name: string; body: string } | null = null;

const app = document.querySelector("#app");
if (!app) throw new Error("#app missing");
const root = app;

root.innerHTML = `
  <div class="shell">
    <div class="header">
      <div class="header-row">
        <h1 data-title></h1>
        <label class="example-picker">Example
          <select data-example>
            ${exampleNames.map((name) => `<option value="${escapeAttr(name)}">${escapeHtml(name)}</option>`).join("")}
          </select>
        </label>
      </div>
      <p>Edit the YAML, tokens, and arguments. The render updates immediately.</p>
    </div>
    <div class="pipeline">
      <span>live YAML</span>
      <span>live tokens</span>
      <span>canonical JSON</span>
      <span>evaluate match / if</span>
      <span>resolved tree</span>
      <span>HTML renderer</span>
    </div>
    <form class="controls" data-controls></form>
    <section class="matrix" data-matrix-section hidden>
      <h2 data-matrix-title></h2>
      <div class="matrix-grid" data-matrix></div>
    </section>
    <p class="banner" data-banner hidden></p>
    <div class="stage">
      <section class="panel">
        <header>Source YAML</header>
        <textarea data-yaml spellcheck="false"></textarea>
      </section>
      <section class="panel">
        <header>Tokens JSON</header>
        <textarea data-tokens spellcheck="false"></textarea>
      </section>
      <section class="panel">
        <header>
          Intermediate
          <div class="tabs">
            <button type="button" data-tab="canonical">Canonical</button>
            <button type="button" data-tab="resolved" aria-pressed="true">Resolved</button>
            <button type="button" data-tab="painted">Tokens in</button>
          </div>
        </header>
        <pre data-ir></pre>
      </section>
      <section class="panel">
        <header>Renderer</header>
        <div class="preview-body" data-preview></div>
      </section>
    </div>
  </div>
`;

const yamlEditor = root.querySelector<HTMLTextAreaElement>("[data-yaml]");
const tokensEditor = root.querySelector<HTMLTextAreaElement>("[data-tokens]");
const exampleSelect = root.querySelector<HTMLSelectElement>("[data-example]");
const controls = root.querySelector<HTMLFormElement>("[data-controls]");
const irPane = root.querySelector<HTMLElement>("[data-ir]");
const preview = root.querySelector<HTMLElement>("[data-preview]");
const banner = root.querySelector<HTMLElement>("[data-banner]");
const title = root.querySelector<HTMLElement>("[data-title]");
const matrix = root.querySelector<HTMLElement>("[data-matrix]");
const matrixTitle = root.querySelector<HTMLElement>("[data-matrix-title]");
const matrixSection = root.querySelector<HTMLElement>("[data-matrix-section]");
if (
  !yamlEditor ||
  !tokensEditor ||
  !exampleSelect ||
  !controls ||
  !irPane ||
  !preview ||
  !banner ||
  !title ||
  !matrix ||
  !matrixTitle ||
  !matrixSection
) {
  throw new Error("viewer DOM missing");
}

const yamlField = yamlEditor;
const tokensField = tokensEditor;
const exampleField = exampleSelect;
const controlsForm = controls;
const irOut = irPane;
const previewOut = preview;
const bannerOut = banner;
const titleOut = title;
const matrixOut = matrix;
const matrixTitleOut = matrixTitle;
const matrixSectionOut = matrixSection;

exampleField.value = selectedExample;
yamlField.value = source;
tokensField.value = tokensText;

exampleField.addEventListener("change", () => {
  const next = exampleField.value;
  if (!catalog[next]) return;
  flushSave();
  selectedExample = next;
  source = catalog[next];
  yamlField.value = source;
  lastGood = parseOpisYaml(source);
  supplied = seedSupplied(lastGood);
  lastArgSignature = "";
  refresh({ rebuildControls: true });
});

yamlField.addEventListener("input", () => {
  source = yamlField.value;
  catalog[selectedExample] = source;
  scheduleRefresh();
  scheduleSave("yaml");
});

tokensField.addEventListener("input", () => {
  tokensText = tokensField.value;
  scheduleRefresh();
  scheduleSave("tokens");
});

controlsForm.addEventListener("change", onControls);
controlsForm.addEventListener("input", onControls);

for (const button of root.querySelectorAll<HTMLButtonElement>("[data-tab]")) {
  button.addEventListener("click", () => {
    irTab = button.dataset.tab as typeof irTab;
    refresh({ rebuildControls: false });
  });
}

if (import.meta.hot) {
  import.meta.hot.accept("../../examples/core.tokens.json?raw", (mod) => {
    if (!mod) return;
    if (ignoreHmr.has("tokens")) {
      ignoreHmr.delete("tokens");
      return;
    }
    if (document.activeElement === tokensField) return;
    tokensText = mod.default as string;
    tokensField.value = tokensText;
    refresh({ rebuildControls: false });
  });
}

refresh({ rebuildControls: true });

function seedSupplied(doc: OpisDocument): Record<string, Json> {
  const out: Record<string, Json> = {};
  const label = doc.arguments?.label;
  if (label?.type === "string" && label.default === undefined) {
    out.label = "Continue";
  }
  return out;
}

function currentLibrary(current: OpisDocument) {
  const docs: OpisDocument[] = [];
  for (const yaml of Object.values(catalog)) {
    try {
      docs.push(parseOpisYaml(yaml));
    } catch {
      // keep the last good document for the file being edited
    }
  }
  docs.push(current);
  return libraryFromDocuments(docs);
}

function catalogFromGlob(modules: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, text] of Object.entries(modules)) {
    const file = path.split("/").pop() ?? path;
    const name = file.replace(/\.opis\.yaml$/, "");
    out[name] = text;
  }
  return out;
}

function onControls() {
  supplied = argsFromForm(controlsForm, lastGood);
  refresh({ rebuildControls: false });
}

function scheduleRefresh() {
  window.clearTimeout(scheduleRefresh.timer);
  scheduleRefresh.timer = window.setTimeout(() => {
    refresh({ rebuildControls: true });
  }, 80);
}
scheduleRefresh.timer = 0 as number;

function scheduleSave(kind: "yaml" | "tokens") {
  pendingSave = {
    kind,
    name: selectedExample,
    body: kind === "yaml" ? source : tokensText,
  };
  window.clearTimeout(scheduleSave.timer);
  scheduleSave.timer = window.setTimeout(() => {
    flushSave();
  }, 450);
}
scheduleSave.timer = 0 as number;

function flushSave() {
  window.clearTimeout(scheduleSave.timer);
  const payload = pendingSave;
  pendingSave = null;
  if (!payload) return;
  ignoreHmr.add(payload.kind);
  const query =
    payload.kind === "yaml"
      ? `file=yaml&name=${encodeURIComponent(payload.name)}`
      : "file=tokens";
  void fetch(`/__opis/save?${query}`, { method: "POST", body: payload.body });
}

function refresh(options: { rebuildControls: boolean }) {
  let parseError: string | null = null;
  let tokenError: string | null = null;
  let doc = lastGood;
  try {
    doc = parseOpisYaml(source);
    lastGood = doc;
  } catch (error) {
    parseError = error instanceof Error ? error.message : String(error);
  }

  try {
    const parsed = JSON.parse(tokensText) as Json;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("tokens JSON must be an object");
    }
    tokenSet = { core: parsed };
    lastGoodTokens = tokenSet;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    tokenError = `Tokens: ${message}`;
    tokenSet = lastGoodTokens;
  }

  supplied = coerceSupplied(doc, supplied);
  titleOut.textContent = doc.component?.name ? `OPIS ${doc.component.name}` : "OPIS";

  const signature = argSignature(doc);
  if (options.rebuildControls && signature !== lastArgSignature) {
    lastArgSignature = signature;
    rebuildControls(doc);
  } else {
    syncControlAvailability(doc);
  }

  for (const button of root.querySelectorAll<HTMLButtonElement>("[data-tab]")) {
    button.setAttribute("aria-pressed", String(button.dataset.tab === irTab));
  }

  const notices = [parseError, tokenError].filter((item): item is string => item != null);
  if (parseError) {
    bannerOut.hidden = false;
    bannerOut.textContent = notices.join(" · ");
    irOut.textContent = parseError;
    previewOut.innerHTML = `<div class="error">${escapeHtml(parseError)}</div>`;
    return;
  }

  const library = currentLibrary(doc);
  const result = evaluateDocument(doc, supplied, tokenSet, {}, { library });
  const errors = result.diagnostics.filter((item) => item.level === "error");
  const bannerMessages = [...notices, ...errors.map((item) => item.message)];
  bannerOut.hidden = bannerMessages.length === 0;
  bannerOut.textContent = bannerMessages.join(" · ");

  irOut.textContent = irText(result, errors.length > 0);
  previewOut.innerHTML = "";
  if (errors.length > 0) {
    previewOut.innerHTML = `<div class="error">${errors.map((item) => escapeHtml(item.message)).join("<br>")}</div>`;
  } else if (result.painted) {
    const node = renderNode(result.painted);
    const color = labelColor(result.painted);
    if (color) node.style.color = color;
    previewOut.append(node);
  }

  paintMatrix(doc);
}

function rebuildControls(doc: OpisDocument) {
  const focused = document.activeElement instanceof HTMLElement ? document.activeElement.getAttribute("name") : null;
  controlsForm.innerHTML = argumentEntries(doc)
    .map(([name, def]) => controlHtml(name, def, name in supplied ? supplied[name] : def.default, doc))
    .join("");
  if (focused) {
    const next = controlsForm.querySelector<HTMLElement>(`[name="${CSS.escape(focused)}"]`);
    next?.focus();
  }
}

function syncControlAvailability(doc: OpisDocument) {
  const ctx = {
    arguments: { ...defaultsOf(doc), ...supplied },
    supplied: new Set(Object.keys(supplied)),
    environment: {},
  };
  for (const [name, def] of argumentEntries(doc)) {
    const field = controlsForm.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${CSS.escape(name)}"]`);
    if (!field) continue;
    field.disabled = def.availableWhen != null && !evalPredicate(def.availableWhen, ctx);
  }
}

function paintMatrix(doc: OpisDocument) {
  const axes = matrixAxes(doc);
  matrixOut.innerHTML = "";
  if (!axes) {
    matrixSectionOut.hidden = true;
    matrixTitleOut.textContent = "";
    return;
  }

  matrixSectionOut.hidden = false;
  if (!axes.cols) {
    matrixTitleOut.textContent = axes.rows.name;
    matrixOut.style.gridTemplateColumns = `72px 1fr`;
    matrixOut.append(axisLabel(""));
    matrixOut.append(axisLabel(axes.rows.name));
    for (const rowValue of axes.rows.values) {
      matrixOut.append(axisLabel(rowValue));
      matrixOut.append(swatch(doc, { [axes.rows.name]: rowValue }));
    }
    return;
  }

  matrixTitleOut.textContent = `${axes.rows.name} × ${axes.cols.name}`;
  matrixOut.style.gridTemplateColumns = `72px repeat(${axes.cols.values.length}, minmax(0, 1fr))`;
  matrixOut.append(axisLabel(""));
  for (const colValue of axes.cols.values) matrixOut.append(axisLabel(colValue));
  for (const rowValue of axes.rows.values) {
    matrixOut.append(axisLabel(rowValue));
    for (const colValue of axes.cols.values) {
      matrixOut.append(swatch(doc, { [axes.rows.name]: rowValue, [axes.cols.name]: colValue }));
    }
  }
}

function swatch(doc: OpisDocument, override: Record<string, Json>): HTMLElement {
  const cell = document.createElement("div");
  cell.className = "swatch";
  const result = evaluateDocument(doc, { ...supplied, ...override }, tokenSet, {}, { library: currentLibrary(doc) });
  if (result.painted) {
    const node = renderNode(result.painted);
    const color = labelColor(result.painted);
    if (color) node.style.color = color;
    cell.append(node);
  } else {
    cell.classList.add("invalid");
    cell.textContent = "invalid";
    const message = result.diagnostics.find((item) => item.level === "error")?.message;
    if (message) cell.title = message;
  }
  return cell;
}

function axisLabel(text: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "axis";
  el.textContent = text;
  return el;
}

function matrixAxes(doc: OpisDocument): {
  rows: { name: string; values: string[] };
  cols: { name: string; values: string[] } | null;
} | null {
  const variants = argumentEntries(doc)
    .filter(([, def]) => def.type === "enum" && def.role === "variant" && (def.values?.length ?? 0) > 0)
    .map(([name, def]) => ({ name, values: def.values ?? [] }));
  const byName = Object.fromEntries(variants.map((item) => [item.name, item]));
  if (byName.size && byName.tone) return { rows: byName.size, cols: byName.tone };
  if (variants.length >= 2) return { rows: variants[0], cols: variants[1] };
  if (variants.length === 1) return { rows: variants[0], cols: null };
  return null;
}

function argumentEntries(doc: OpisDocument): Array<[string, ArgumentDefinition]> {
  return Object.entries(doc.arguments ?? {}) as Array<[string, ArgumentDefinition]>;
}

function argSignature(doc: OpisDocument): string {
  return JSON.stringify(
    argumentEntries(doc).map(([name, def]) => [name, def.type, def.values ?? null, def.optional ?? false]),
  );
}

function defaultsOf(doc: OpisDocument): Record<string, Json> {
  const out: Record<string, Json> = {};
  for (const [name, def] of argumentEntries(doc)) {
    if (def.default !== undefined) out[name] = def.default;
  }
  return out;
}

function coerceSupplied(doc: OpisDocument, current: Record<string, Json>): Record<string, Json> {
  const names = new Set(argumentEntries(doc).map(([name]) => name));
  const next: Record<string, Json> = {};
  for (const [name, value] of Object.entries(current)) {
    if (!names.has(name)) continue;
    next[name] = value;
  }
  for (const [name, def] of argumentEntries(doc)) {
    if (def.type !== "enum" || !def.values) continue;
    const value = next[name];
    if (typeof value === "string" && !def.values.includes(value)) {
      if (def.default !== undefined) next[name] = def.default;
      else delete next[name];
    }
  }
  return next;
}

function argsFromForm(form: HTMLFormElement, doc: OpisDocument): Record<string, Json> {
  const data = new FormData(form);
  const out: Record<string, Json> = {};
  for (const [name, def] of argumentEntries(doc)) {
    const raw = data.get(name);
    if (def.type === "component") {
      if (raw === "true") out[name] = { component: "com.example/Icon" };
      continue;
    }
    if (def.type === "component[]") continue;
    if (def.type === "boolean") {
      out[name] = raw === "true";
      continue;
    }
    if (def.type === "string") {
      const text = String(raw ?? "");
      if (text !== "") out[name] = text;
      continue;
    }
    if (def.type === "number") {
      if (raw != null && String(raw) !== "") out[name] = Number(raw);
      continue;
    }
    if (def.type === "enum" && raw != null && String(raw) !== "") {
      out[name] = String(raw);
    }
  }
  return out;
}

function controlHtml(
  name: string,
  def: ArgumentDefinition,
  value: Json | undefined,
  doc: OpisDocument,
): string {
  const ctx = {
    arguments: { ...defaultsOf(doc), ...supplied },
    supplied: new Set(Object.keys(supplied)),
    environment: {},
  };
  const disabled = def.availableWhen != null && !evalPredicate(def.availableWhen, ctx);
  if (def.type === "enum") {
    const current = typeof value === "string" ? value : String(def.default ?? def.values?.[0] ?? "");
    return select(name, def.values ?? [], current, disabled);
  }
  if (def.type === "string") {
    const current = typeof value === "string" ? value : "";
    return `<label>${escapeHtml(name)}<input name="${escapeAttr(name)}" type="text" value="${escapeAttr(current)}" ${disabled ? "disabled" : ""} /></label>`;
  }
  if (def.type === "boolean") {
    const on = value === true;
    return select(name, ["false", "true"], on ? "true" : "false", disabled);
  }
  if (def.type === "component") {
    const on = value != null && value !== false;
    return `<label>${escapeHtml(name)}
      <select name="${escapeAttr(name)}" ${disabled ? "disabled" : ""}>
        <option value="false" ${on ? "" : "selected"}>none</option>
        <option value="true" ${on ? "selected" : ""}>plus</option>
      </select>
    </label>`;
  }
  if (def.type === "number") {
    const current = typeof value === "number" ? String(value) : "";
    return `<label>${escapeHtml(name)}<input name="${escapeAttr(name)}" type="number" value="${escapeAttr(current)}" ${disabled ? "disabled" : ""} /></label>`;
  }
  return "";
}

function select(name: string, values: string[], current: string, disabled = false) {
  return `<label>${escapeHtml(name)}
    <select name="${escapeAttr(name)}" ${disabled ? "disabled" : ""}>
      ${values.map((item) => `<option value="${escapeAttr(item)}" ${item === current ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}
    </select>
  </label>`;
}

function irText(result: ReturnType<typeof evaluateDocument>, invalid: boolean): string {
  if (irTab === "canonical") return JSON.stringify(result.canonical, null, 2);
  if (invalid) return JSON.stringify({ diagnostics: result.diagnostics }, null, 2);
  if (irTab === "painted") return JSON.stringify(result.painted, null, 2);
  return JSON.stringify(result.instance, null, 2);
}

function labelColor(tree: Json): string | null {
  if (!tree || typeof tree !== "object" || Array.isArray(tree)) return null;
  const record = tree as { [key: string]: Json };
  if (!Array.isArray(record.children)) return null;
  for (const child of record.children) {
    if (!child || typeof child !== "object" || Array.isArray(child)) continue;
    const node = child as { [key: string]: Json };
    if (node.id !== "label" || !node.style || typeof node.style !== "object" || Array.isArray(node.style)) continue;
    const color = (node.style as { [key: string]: Json }).color;
    if (typeof color === "string" && color !== "inherit") return color;
  }
  return null;
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttr(value: string) {
  return escapeHtml(value).replaceAll('"', "&quot;");
}
