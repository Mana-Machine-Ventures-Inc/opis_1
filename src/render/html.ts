import { isObject } from "../core/expressions.ts";
import type { Json } from "../core/types.ts";

export function renderNode(tree: Json): HTMLElement {
  const el = createNode(tree);
  el.classList.add("opis-root");
  return el;
}

function createNode(value: Json): HTMLElement {
  if (!isObject(value) || typeof value.type !== "string") {
    const empty = document.createElement("span");
    empty.dataset.missing = "true";
    return empty;
  }

  if (value.hidden === true) {
    return document.createElement("span");
  }

  if (value.type === "text") {
    const text = document.createElement("span");
    text.className = "opis-text";
    text.textContent = value.content == null ? "" : String(value.content);
    applyStyle(text, value.style);
    return text;
  }

  if (value.type === "slot") {
    if (isAbsentSlot(value.source)) {
      return document.createElement("span");
    }
    return renderIcon(value);
  }

  const box = document.createElement("div");
  box.className = `opis-node opis-${value.type}`;
  if (typeof value.id === "string") box.dataset.id = value.id;

  if (value.type === "stack" || value.type === "collection") {
    box.style.display = "flex";
    box.style.flexDirection = value.axis === "vertical" ? "column" : "row";
    box.style.alignItems = alignItems(value.align);
    box.style.justifyContent = justifyContent(value.distribution);
  }

  applyBox(box, value);
  applyStyle(box, value.style);

  const children = participatingChildren(value);
  for (const child of children) {
    const rendered = createNode(withInheritedMetrics(child, value));
    if (rendered.dataset.missing === "true") continue;
    if (rendered.tagName === "SPAN" && rendered.className === "" && !rendered.textContent) {
      continue;
    }
    box.append(rendered);
  }

  return box;
}

function withInheritedMetrics(child: Json, parent: { [key: string]: Json }): Json {
  if (!isObject(child) || child.type !== "slot") return child;
  return { ...child, height: parent.height ?? null };
}

function participatingChildren(node: { [key: string]: Json }): Json[] {
  if (!Array.isArray(node.children)) return [];
  return node.children.filter((child) => {
    if (!isObject(child)) return false;
    if (child.hidden === true) return false;
    if (child.type === "slot" && isAbsentSlot(child.source)) return false;
    return true;
  });
}

function isAbsentSlot(source: Json | undefined): boolean {
  return source == null || source === false;
}

function renderIcon(node: { [key: string]: Json }): HTMLElement {
  const wrap = document.createElement("span");
  wrap.className = "opis-icon";
  wrap.setAttribute("aria-hidden", "true");
  const size = iconSize(node);
  wrap.style.width = `${size}px`;
  wrap.style.height = `${size}px`;
  wrap.innerHTML = `<svg viewBox="0 0 16 16" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M8 5v6M5 8h6"/></svg>`;
  return wrap;
}

function iconSize(node: { [key: string]: Json }): number {
  const height = dimensionValue(node.height);
  if (height) return Math.max(12, Math.round(height * 0.45));
  return 16;
}

function applyBox(el: HTMLElement, node: { [key: string]: Json }) {
  const gap = cssLength(node.gap);
  if (gap) el.style.gap = gap;

  applyPadding(el, node.padding);
  applyDimension(el, "height", node.height);
  applyDimension(el, "width", node.width);
}

function applyPadding(el: HTMLElement, padding: Json | undefined) {
  if (padding == null) return;
  if (typeof padding === "number" || typeof padding === "string") {
    el.style.padding = cssLength(padding) ?? "0";
    return;
  }
  if (!isObject(padding)) return;
  if (padding.block != null) el.style.paddingBlock = cssLength(padding.block) ?? "";
  if (padding.inline != null) el.style.paddingInline = cssLength(padding.inline) ?? "";
  if (padding.top != null) el.style.paddingTop = cssLength(padding.top) ?? "";
  if (padding.right != null) el.style.paddingRight = cssLength(padding.right) ?? "";
  if (padding.bottom != null) el.style.paddingBottom = cssLength(padding.bottom) ?? "";
  if (padding.left != null) el.style.paddingLeft = cssLength(padding.left) ?? "";
}

function applyDimension(
  el: HTMLElement,
  property: "width" | "height",
  value: Json | undefined,
) {
  if (!isObject(value) || typeof value.mode !== "string") return;
  if (value.mode === "fixed") {
    el.style[property] = cssLength(value.value) ?? "";
    if (property === "width") el.style.flex = "0 0 auto";
  } else if (value.mode === "fill") {
    el.style[property] = "100%";
  } else if (value.mode === "intrinsic") {
    el.style[property] = "auto";
  }
}

function applyStyle(el: HTMLElement, style: Json | undefined) {
  if (!isObject(style)) return;
  if (typeof style.background === "string") el.style.background = style.background;
  if (typeof style.color === "string") el.style.color = style.color;
  if (style.radius != null) el.style.borderRadius = cssLength(style.radius) ?? "";
  if (isObject(style.typography)) {
    const type = style.typography;
    if (typeof type.fontFamily === "string") el.style.fontFamily = type.fontFamily;
    if (type.fontSize != null) el.style.fontSize = cssLength(type.fontSize) ?? "";
    if (type.fontWeight != null) el.style.fontWeight = String(type.fontWeight);
    if (type.lineHeight != null) el.style.lineHeight = String(type.lineHeight);
    if (type.letterSpacing != null) el.style.letterSpacing = String(type.letterSpacing);
  }
}

function alignItems(value: Json | undefined): string {
  switch (value) {
    case "start":
      return "flex-start";
    case "end":
      return "flex-end";
    case "stretch":
      return "stretch";
    default:
      return "center";
  }
}

function justifyContent(value: Json | undefined): string {
  switch (value) {
    case "start":
      return "flex-start";
    case "end":
      return "flex-end";
    case "spaceBetween":
      return "space-between";
    default:
      return "center";
  }
}

function cssLength(value: Json | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "number") return value === 0 ? "0px" : `${value}px`;
  if (typeof value === "string") return value;
  return null;
}

function dimensionValue(value: Json | undefined): number | null {
  if (!isObject(value) || value.mode !== "fixed") return null;
  const raw = cssLength(value.value);
  if (!raw) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}
