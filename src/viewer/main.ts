import buttonYaml from "../../examples/Button.opis.yaml?raw";
import tokenDoc from "../../examples/core.tokens.json";
import { evaluateDocument, parseOpisYaml } from "../core/index.ts";
import type { Json } from "../core/types.ts";
import { renderNode } from "../render/html.ts";

const doc = parseOpisYaml(buttonYaml);
const tokens = { core: tokenDoc as Json };

type Axes = {
  kind: "text" | "icon";
  size: "small" | "medium" | "large";
  tone: "primary" | "secondary" | "destructive";
  label: string;
  icon: boolean;
  iconPosition: "leading" | "trailing";
};

const sizes: Axes["size"][] = ["small", "medium", "large"];
const tones: Axes["tone"][] = ["primary", "secondary", "destructive"];

let irTab: "canonical" | "resolved" | "painted" = "resolved";
let axes: Axes = {
  kind: "text",
  size: "medium",
  tone: "primary",
  label: "Continue",
  icon: false,
  iconPosition: "leading",
};

const app = document.querySelector("#app");
if (!app) throw new Error("#app missing");
const root = app;

function suppliedArgs(current: Axes): Record<string, Json> {
  const args: Record<string, Json> = {
    kind: current.kind,
    size: current.size,
    tone: current.tone,
  };
  if (current.kind === "text") args.label = current.label;
  if (current.icon || current.kind === "icon") {
    args.icon = { component: "com.example/Icon" };
    args.iconPosition = current.iconPosition;
  }
  return args;
}

function render() {
  const args = suppliedArgs(axes);
  const result = evaluateDocument(doc, args, tokens);
  const errors = result.diagnostics.filter((item) => item.level === "error");

  root.innerHTML = `
    <div class="shell">
      <div class="header">
        <h1>OPIS Button</h1>
        <p>YAML in, canonical JSON with <code>match</code> intact, then a resolved tree, then HTML.</p>
      </div>
      <div class="pipeline">
        <span>Button.opis.yaml</span>
        <span>canonical JSON</span>
        <span>evaluate match / if</span>
        <span>resolved tree</span>
        <span>HTML renderer</span>
      </div>
      <form class="controls">
        ${select("kind", ["text", "icon"], axes.kind)}
        ${select("size", sizes, axes.size)}
        ${select("tone", tones, axes.tone)}
        <label>label<input name="label" type="text" value="${escapeAttr(axes.label)}" ${axes.kind === "icon" ? "disabled" : ""} /></label>
        <label>icon
          <select name="icon">
            <option value="false" ${!axes.icon && axes.kind !== "icon" ? "selected" : ""}>none</option>
            <option value="true" ${axes.icon || axes.kind === "icon" ? "selected" : ""}>plus</option>
          </select>
        </label>
        ${select("iconPosition", ["leading", "trailing"], axes.iconPosition, !axes.icon && axes.kind !== "icon")}
      </form>
      <div class="stage">
        <section class="panel">
          <header>Source YAML</header>
          <pre>${escapeHtml(buttonYaml.trim())}</pre>
        </section>
        <section class="panel">
          <header>
            Intermediate
            <div class="tabs">
              ${tabButton("canonical", "Canonical")}
              ${tabButton("resolved", "Resolved")}
              ${tabButton("painted", "Tokens in")}
            </div>
          </header>
          <pre>${escapeHtml(irText(result, errors.length > 0))}</pre>
        </section>
        <section class="panel">
          <header>Renderer</header>
          <div class="preview-body" data-preview></div>
        </section>
      </div>
      <section class="matrix">
        <h2>size × tone for kind=${axes.kind}</h2>
        <div class="matrix-grid" data-matrix></div>
      </section>
    </div>
  `;

  const form = root.querySelector("form");
  form?.addEventListener("change", onChange);
  form?.addEventListener("input", onChange);

  for (const button of root.querySelectorAll<HTMLButtonElement>(".tabs button")) {
    button.addEventListener("click", () => {
      irTab = button.dataset.tab as typeof irTab;
      render();
    });
  }

  const preview = root.querySelector("[data-preview]");
  if (preview) {
    if (errors.length > 0) {
      preview.innerHTML = `<div class="error">${errors.map((item) => escapeHtml(item.message)).join("<br>")}</div>`;
    } else if (result.painted) {
      const rootColor = labelColor(result.painted);
      const node = renderNode(result.painted);
      if (rootColor) node.style.color = rootColor;
      preview.append(node);
    }
  }

  const matrix = root.querySelector("[data-matrix]");
  if (matrix) paintMatrix(matrix);
}

function irText(
  result: ReturnType<typeof evaluateDocument>,
  invalid: boolean,
): string {
  if (irTab === "canonical") return JSON.stringify(result.canonical, null, 2);
  if (invalid) return JSON.stringify({ diagnostics: result.diagnostics }, null, 2);
  if (irTab === "painted") return JSON.stringify(result.painted, null, 2);
  return JSON.stringify(result.instance, null, 2);
}

function paintMatrix(root: Element) {
  root.innerHTML = `<div></div>${tones.map((tone) => `<div class="axis">${tone}</div>`).join("")}`;
  for (const size of sizes) {
    const label = document.createElement("div");
    label.className = "axis";
    label.textContent = size;
    root.append(label);
    for (const tone of tones) {
      const cell = document.createElement("div");
      cell.className = "swatch";
      const result = evaluateDocument(
        doc,
        suppliedArgs({ ...axes, size, tone }),
        tokens,
      );
      if (result.painted) {
        const node = renderNode(result.painted);
        const color = labelColor(result.painted);
        if (color) node.style.color = color;
        cell.append(node);
      } else {
        cell.textContent = "invalid";
      }
      root.append(cell);
    }
  }
}

function labelColor(tree: Json): string | null {
  if (!tree || typeof tree !== "object" || Array.isArray(tree)) return null;
  const record = tree as { [key: string]: Json };
  if (Array.isArray(record.children)) {
    for (const child of record.children) {
      if (child && typeof child === "object" && !Array.isArray(child)) {
        const node = child as { [key: string]: Json };
        if (node.id === "label" && node.style && typeof node.style === "object" && !Array.isArray(node.style)) {
          const color = (node.style as { [key: string]: Json }).color;
          if (typeof color === "string") return color;
        }
      }
    }
  }
  return null;
}

function onChange(event: Event) {
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;
  const data = new FormData(form);
  axes = {
    kind: String(data.get("kind")) as Axes["kind"],
    size: String(data.get("size")) as Axes["size"],
    tone: String(data.get("tone")) as Axes["tone"],
    label: String(data.get("label") ?? axes.label),
    icon: data.get("icon") === "true" || String(data.get("kind")) === "icon",
    iconPosition: String(data.get("iconPosition")) as Axes["iconPosition"],
  };
  render();
}

function select(name: string, values: string[], current: string, disabled = false) {
  return `<label>${name}
    <select name="${name}" ${disabled ? "disabled" : ""}>
      ${values.map((value) => `<option value="${value}" ${value === current ? "selected" : ""}>${value}</option>`).join("")}
    </select>
  </label>`;
}

function tabButton(id: typeof irTab, label: string) {
  return `<button type="button" data-tab="${id}" aria-pressed="${irTab === id}">${label}</button>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(value: string) {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

render();
