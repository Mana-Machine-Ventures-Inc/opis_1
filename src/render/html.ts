import { isObject } from "../core/expressions.ts";
import type { Json } from "../core/types.ts";

const GLYPHS: Record<string, string> = {
  plus: `<circle cx="8" cy="8" r="6"/><path d="M8 5v6M5 8h6"/>`,
  search: `<circle cx="7" cy="7" r="4.25"/><path d="M10.2 10.2L13 13"/>`,
  check: `<path d="M3.5 8.2l3 3.1 6-6.4"/>`,
  close: `<path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/>`,
  minus: `<path d="M4 8h8"/>`,
  info: `<circle cx="8" cy="8" r="6"/><path d="M8 7.2v4"/><path d="M8 5.2v0.1"/>`,
  warning: `<path d="M8 2.8L14 13.2H2L8 2.8z"/><path d="M8 6.6v3.2"/><path d="M8 11.4v0.2"/>`,
};

const TONE_FILL: Record<string, string> = {
  primary: "#2563eb",
  secondary: "#e2e8f0",
  destructive: "#dc2626",
};

const TONE_INK: Record<string, string> = {
  primary: "#ffffff",
  secondary: "#0f172a",
  destructive: "#ffffff",
};

export function renderNode(tree: Json): HTMLElement {
  const el = createNode(tree);
  el.classList.add("opis-root");
  return el;
}

function createNode(value: Json, parentAxis?: "horizontal" | "vertical"): HTMLElement {
  if (!isObject(value) || typeof value.type !== "string") {
    const empty = document.createElement("span");
    empty.dataset.missing = "true";
    return empty;
  }

  if (value.hidden === true) {
    return document.createElement("span");
  }

  if (value.type === "text") {
    const text = document.createElement("div");
    text.className = "opis-text";
    const run = document.createElement("span");
    run.className = "opis-text-run";
    run.textContent = value.content == null ? "" : String(value.content);
    const inline = textInlineAlign(value);
    const block = textBlockAlign(value);
    run.style.width = "100%";
    run.style.textAlign = cssTextAlign(inline);
    text.style.display = "flex";
    text.style.flexDirection = "column";
    text.style.justifyContent = cssJustifyBlock(block);
    applyBox(text, value, parentAxis);
    applyStyle(text, value.style);
    if (parentAxis === "horizontal" && isObject(value.width) && value.width.mode === "fill") {
      run.style.whiteSpace = "nowrap";
      run.style.overflow = "hidden";
      run.style.textOverflow = "ellipsis";
    }
    text.append(run);
    return text;
  }

  if (value.type === "slot") {
    if (isAbsentSlot(value.source)) {
      return document.createElement("span");
    }
    if (isObject(value.source) && typeof value.source.type === "string") {
      return createNode(value.source, parentAxis);
    }
    return renderIcon(value);
  }

  if (value.type === "instance") {
    const painted = Array.isArray(value.children) ? value.children[0] : null;
    const inner = painted == null ? document.createElement("div") : createNode(painted, parentAxis);
    applyBox(inner, value, parentAxis);
    return inner;
  }

  if (value.type === "component") {
    return renderComponent(value, parentAxis);
  }

  const box = document.createElement("div");
  box.className = `opis-node opis-${value.type}`;
  if (typeof value.id === "string") box.dataset.id = value.id;

  const axis: "horizontal" | "vertical" | undefined =
    value.type === "stack" || value.type === "collection"
      ? value.axis === "vertical"
        ? "vertical"
        : "horizontal"
      : parentAxis;

  if (value.type === "stack" || value.type === "collection") {
    box.style.display = "flex";
    box.style.flexDirection = axis === "vertical" ? "column" : "row";
    box.style.alignItems = alignItems(value.align);
    box.style.justifyContent = justifyContent(value.distribution);
    if (value.wrap === true) box.style.flexWrap = "wrap";
  }

  if (value.type === "overlay") {
    box.style.display = "grid";
    box.style.gridTemplate = "1fr / 1fr";
    if (value.overflow == null) box.style.overflow = "hidden";
  }

  if (value.type === "media") {
    box.setAttribute("aria-hidden", "true");
    box.style.display = "flex";
    box.style.alignItems = "center";
    box.style.justifyContent = "center";
  }

  applyBox(box, value, parentAxis);
  applyStyle(box, value.style);

  const children = participatingChildren(value);
  for (const child of children) {
    const rendered = createNode(
      withInheritedMetrics(child, value),
      value.type === "overlay" ? undefined : axis,
    );
    if (rendered.dataset.missing === "true") continue;
    if (rendered.tagName === "SPAN" && rendered.className === "" && !rendered.textContent) {
      continue;
    }
    if (value.overflow === "scroll") rendered.style.flexShrink = "0";
    if (value.type === "overlay" && isObject(child)) {
      applyOverlayChild(rendered, child, value);
    }
    box.append(rendered);
  }

  return box;
}

function withInheritedMetrics(child: Json, parent: { [key: string]: Json }): Json {
  if (!isObject(child) || child.type !== "slot") return child;
  return { ...child, height: child.height ?? parent.height ?? null };
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
  wrap.style.flex = "0 0 auto";
  applyStyle(wrap, node.style);
  const name = glyphName(node.source);
  const paths = GLYPHS[name] ?? GLYPHS.plus;
  wrap.innerHTML = `<svg viewBox="0 0 16 16" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  return wrap;
}

function glyphName(source: Json | undefined): string {
  if (isObject(source) && typeof source.glyph === "string") return source.glyph;
  if (isObject(source) && isObject(source.arguments) && typeof source.arguments.name === "string") {
    return source.arguments.name;
  }
  return "plus";
}

function renderComponent(node: { [key: string]: Json }, parentAxis?: "horizontal" | "vertical"): HTMLElement {
  const args = isObject(node.arguments) ? node.arguments : {};
  const label = args.label == null ? stubLabel(node) : String(args.label);
  const tone = typeof args.tone === "string" ? args.tone : "secondary";
  const el = document.createElement("div");
  el.className = "opis-component";
  el.textContent = label;
  el.style.display = "inline-flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.gap = "8px";
  el.style.height = "32px";
  el.style.padding = "0 12px";
  el.style.borderRadius = "8px";
  el.style.fontFamily = "Inter, ui-sans-serif, system-ui, sans-serif";
  el.style.fontSize = "13px";
  el.style.fontWeight = "600";
  el.style.lineHeight = "1.2";
  el.style.whiteSpace = "nowrap";
  el.style.background = TONE_FILL[tone] ?? TONE_FILL.secondary;
  el.style.color = TONE_INK[tone] ?? TONE_INK.secondary;
  applyBox(el, node, parentAxis);
  applyStyle(el, node.style);
  return el;
}

function stubLabel(node: { [key: string]: Json }): string {
  if (typeof node.component === "string") {
    const parts = node.component.split("/");
    return parts[parts.length - 1] || "Component";
  }
  return "Component";
}

function iconSize(node: { [key: string]: Json }): number {
  const height = dimensionValue(node.height);
  if (height) return Math.max(12, Math.round(height * 0.55));
  return 16;
}

function applyOverlayChild(
  el: HTMLElement,
  child: { [key: string]: Json },
  overlay: { [key: string]: Json },
) {
  el.style.gridArea = "1 / 1";
  el.style.minWidth = "0";
  el.style.minHeight = "0";
  const alignment = isObject(overlay.alignment) ? overlay.alignment : {};
  const widthFill = isObject(child.width) && child.width.mode === "fill";
  const heightFill = isObject(child.height) && child.height.mode === "fill";
  el.style.justifySelf = widthFill ? "stretch" : overlaySelf(alignment.inline);
  el.style.alignSelf = heightFill ? "stretch" : overlaySelf(alignment.block);
  if (widthFill) el.style.width = "100%";
  if (heightFill) el.style.height = "100%";
}

function overlaySelf(value: Json | undefined): string {
  switch (value) {
    case "start":
      return "start";
    case "end":
      return "end";
    case "stretch":
      return "stretch";
    default:
      return "center";
  }
}

function applyBox(
  el: HTMLElement,
  node: { [key: string]: Json },
  parentAxis?: "horizontal" | "vertical",
) {
  const gap = node.type === "overlay" ? null : cssLength(node.gap);
  if (gap) el.style.gap = gap;

  applyPadding(el, node.padding);
  applyDimension(el, "height", node.height, parentAxis);
  applyDimension(el, "width", node.width, parentAxis);

  if (node.maxWidth != null) {
    const maxWidth = cssLength(node.maxWidth);
    if (maxWidth) el.style.maxWidth = maxWidth;
  }
  if (node.minWidth != null) {
    const minWidth = cssLength(node.minWidth);
    if (minWidth) el.style.minWidth = minWidth;
  }
  if (node.minHeight != null) {
    const minHeight = cssLength(node.minHeight);
    if (minHeight) el.style.minHeight = minHeight;
  }
  if (node.maxHeight != null) {
    const maxHeight = cssLength(node.maxHeight);
    if (maxHeight) el.style.maxHeight = maxHeight;
  }
  if (node.aspectRatio != null) el.style.aspectRatio = String(node.aspectRatio);
  if (node.overflow != null) {
    const overflow = String(node.overflow);
    if (overflow === "scroll") {
      el.dataset.overflow = "scroll";
      const vertical = node.axis === "vertical";
      el.style.overflowX = vertical ? "hidden" : "auto";
      el.style.overflowY = vertical ? "auto" : "hidden";
      el.style.maxWidth = el.style.maxWidth || "100%";
      el.style.minWidth = el.style.minWidth || "0";
      if (!vertical && node.wrap !== true) el.style.flexWrap = "nowrap";
    } else {
      el.style.overflow = overflow === "clip" ? "hidden" : overflow;
    }
  }
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
  parentAxis?: "horizontal" | "vertical",
) {
  if (!isObject(value) || typeof value.mode !== "string") return;
  if (value.mode === "fixed") {
    el.style[property] = cssLength(value.value) ?? "";
    if (property === "width") el.style.flex = "0 0 auto";
  } else if (value.mode === "fill") {
    el.style[property] = "100%";
    if (property === "width") {
      el.style.minWidth = el.style.minWidth || "0";
      el.dataset.widthMode = "fill";
      if (parentAxis === "horizontal") el.style.flex = "1 1 auto";
    }
    if (property === "height" && parentAxis === "vertical") {
      el.style.flex = "1 1 auto";
    }
  } else if (value.mode === "intrinsic") {
    el.style[property] = "auto";
  }
}

function applyStyle(el: HTMLElement, style: Json | undefined) {
  if (!isObject(style)) return;
  if (typeof style.background === "string") el.style.background = style.background;
  if (typeof style.color === "string") el.style.color = style.color;
  if (style.radius != null) el.style.borderRadius = cssLength(style.radius) ?? "";
  if (style.opacity != null) el.style.opacity = String(style.opacity);
  if (typeof style.border === "string") el.style.border = style.border;
  if (typeof style.stroke === "string") el.style.border = `1px solid ${style.stroke}`;
  if (typeof style.shadow === "string") el.style.boxShadow = style.shadow;
  if (isObject(style.typography)) {
    const type = style.typography;
    if (typeof type.fontFamily === "string") el.style.fontFamily = type.fontFamily;
    if (type.fontSize != null) el.style.fontSize = cssLength(type.fontSize) ?? "";
    if (type.fontWeight != null) el.style.fontWeight = String(type.fontWeight);
    if (type.lineHeight != null) el.style.lineHeight = String(type.lineHeight);
    if (type.letterSpacing != null) el.style.letterSpacing = String(type.letterSpacing);
  }
}

function textInlineAlign(node: { [key: string]: Json }): string {
  if (isObject(node.alignment) && node.alignment.inline != null) {
    return String(node.alignment.inline);
  }
  if (typeof node.align === "string") return node.align;
  return "start";
}

function textBlockAlign(node: { [key: string]: Json }): string {
  if (isObject(node.alignment) && node.alignment.block != null) {
    return String(node.alignment.block);
  }
  return "start";
}

function cssTextAlign(value: string): string {
  switch (value) {
    case "center":
      return "center";
    case "end":
      return "end";
    case "justify":
      return "justify";
    default:
      return "start";
  }
}

function cssJustifyBlock(value: string): string {
  switch (value) {
    case "center":
      return "center";
    case "end":
      return "flex-end";
    default:
      return "flex-start";
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
