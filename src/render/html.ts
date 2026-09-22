import { isObject } from "../core/expressions.ts";
import type { Json } from "../core/types.ts";
import { iconUrl } from "./icons.ts";
import { applyLayerMask, applyPaint, applyTypography, cssLength, isMaskChild } from "./paint.ts";

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
    if (typeof value.id === "string") text.dataset.id = value.id;
    const run = document.createElement("span");
    run.className = "opis-text-run";
    fillTextRun(run, value);
    const inline = textInlineAlign(value);
    const block = textBlockAlign(value);
    run.style.width = "100%";
    run.style.textAlign = cssTextAlign(inline);
    text.style.display = "flex";
    text.style.flexDirection = "column";
    text.style.justifyContent = cssJustifyBlock(block);
    applyBox(text, value, parentAxis);
    applyPaint(text, value.style, value);
    if (
      !value.maxLines &&
      parentAxis === "horizontal" &&
      isObject(value.width) &&
      value.width.mode === "fill"
    ) {
      run.style.whiteSpace = "nowrap";
      run.style.overflow = "hidden";
      run.style.textOverflow = "ellipsis";
    }
    text.append(run);
    return text;
  }

  if (value.type === "icon") {
    return renderIcon(value, parentAxis);
  }

  if (value.type === "slot") {
    if (isAbsentSlot(value.source)) {
      return document.createElement("span");
    }
    if (isObject(value.source) && typeof value.source.type === "string") {
      return createNode(value.source, parentAxis);
    }
    return renderIcon(value, parentAxis);
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
  applyPaint(box, value.style, value);

  const children = participatingChildren(value);
  let maskPocket: HTMLElement | null = null;
  let paintIndex = 0;
  for (const child of children) {
    if (value.type === "overlay" && isObject(child) && isMaskChild(child)) {
      const pocket = document.createElement("div");
      pocket.className = "opis-mask";
      pocket.style.display = "grid";
      pocket.style.gridTemplate = "1fr / 1fr";
      pocket.style.isolation = "isolate";
      pocket.style.zIndex = String(paintIndex++);
      applyOverlayChild(pocket, child, value);
      applyBox(pocket, child);
      applyLayerMask(pocket, child);
      box.append(pocket);
      maskPocket = pocket;
      continue;
    }
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
      rendered.style.zIndex = String(paintIndex++);
    }
    (maskPocket ?? box).append(rendered);
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

function renderIcon(node: { [key: string]: Json }, parentAxis?: "horizontal" | "vertical"): HTMLElement {
  const wrap = document.createElement("span");
  wrap.className = "opis-icon";
  if (typeof node.id === "string") wrap.dataset.id = node.id;
  wrap.setAttribute("aria-hidden", "true");
  const size = iconSize(node);
  wrap.style.width = `${size}px`;
  wrap.style.height = `${size}px`;
  wrap.style.flex = "0 0 auto";
  applyBox(wrap, node, parentAxis);
  applyPaint(wrap, node.style, node);
  const name = glyphName(node);
  const url = iconUrl(name);
  wrap.dataset.icon = name;
  if (!url) return wrap;
  if (node.kind === "artwork") {
    const img = document.createElement("img");
    img.src = url;
    img.alt = "";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "contain";
    wrap.append(img);
    return wrap;
  }
  wrap.style.backgroundColor = "currentColor";
  wrap.style.webkitMaskImage = `url("${url}")`;
  wrap.style.maskImage = `url("${url}")`;
  wrap.style.webkitMaskRepeat = "no-repeat";
  wrap.style.maskRepeat = "no-repeat";
  wrap.style.webkitMaskPosition = "center";
  wrap.style.maskPosition = "center";
  wrap.style.webkitMaskSize = "contain";
  wrap.style.maskSize = "contain";
  return wrap;
}

function glyphName(node: { [key: string]: Json }): string {
  if (typeof node.name === "string") return node.name;
  if (isObject(node.source) && typeof node.source.glyph === "string") return node.source.glyph;
  if (isObject(node.source) && isObject(node.source.arguments) && typeof node.source.arguments.name === "string") {
    return node.source.arguments.name;
  }
  if (isObject(node.arguments) && typeof node.arguments.name === "string") return node.arguments.name;
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
  applyPaint(el, node.style, node);
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
  const pin = isObject(child.pin) ? child.pin : isObject(overlay.alignment) ? overlay.alignment : {};
  const widthFill = isObject(child.width) && child.width.mode === "fill";
  const heightFill = isObject(child.height) && child.height.mode === "fill";
  el.style.justifySelf = widthFill ? "stretch" : overlaySelf(pin.inline);
  el.style.alignSelf = heightFill ? "stretch" : overlaySelf(pin.block);
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
  applyPadding(el, node.margin, "margin");
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

function applyPadding(el: HTMLElement, padding: Json | undefined, kind: "padding" | "margin" = "padding") {
  if (padding == null) return;
  if (typeof padding === "number" || typeof padding === "string") {
    el.style[kind] = cssLength(padding) ?? "0";
    return;
  }
  if (!isObject(padding)) return;
  const assign = (prop: "paddingBlock" | "paddingInline" | "paddingTop" | "paddingRight" | "paddingBottom" | "paddingLeft" | "marginBlock" | "marginInline" | "marginTop" | "marginRight" | "marginBottom" | "marginLeft", raw: Json | undefined) => {
    if (raw == null) return;
    const len = cssLength(raw);
    if (len) el.style[prop] = len;
  };
  if (kind === "margin") {
    assign("marginBlock", padding.block);
    assign("marginInline", padding.inline);
    assign("marginTop", padding.top);
    assign("marginRight", padding.right);
    assign("marginBottom", padding.bottom);
    assign("marginLeft", padding.left);
    return;
  }
  assign("paddingBlock", padding.block);
  assign("paddingInline", padding.inline);
  assign("paddingTop", padding.top);
  assign("paddingRight", padding.right);
  assign("paddingBottom", padding.bottom);
  assign("paddingLeft", padding.left);
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
    const weight = Number(value.weight ?? 1);
    const grow = Number.isFinite(weight) && weight > 0 ? weight : 1;
    const main =
      (property === "width" && parentAxis === "horizontal") ||
      (property === "height" && parentAxis === "vertical");
    if (main) {
      el.style.flexGrow = String(grow);
      el.style.flexShrink = "1";
      el.style.flexBasis = "0px";
      el.style[property] = "auto";
      if (property === "width") {
        el.style.minWidth = el.style.minWidth || "0";
        el.dataset.widthMode = "fill";
      }
    } else {
      el.style[property] = "100%";
      if (property === "width") {
        el.style.minWidth = el.style.minWidth || "0";
        el.dataset.widthMode = "fill";
      }
    }
  } else if (value.mode === "intrinsic") {
    el.style[property] = "auto";
  }
}

function fillTextRun(run: HTMLElement, node: { [key: string]: Json }) {
  const spans = node.spans;
  if (Array.isArray(spans) && spans.length > 0) {
    for (const span of spans) {
      if (!isObject(span)) continue;
      const piece = document.createElement("span");
      piece.textContent = span.content == null ? "" : String(span.content);
      if (isObject(span.style)) {
        if (typeof span.style.color === "string") piece.style.color = span.style.color;
        applyTypography(piece, span.style.typography);
        applyTypography(piece, span.style);
      }
      run.append(piece);
    }
    return;
  }
  run.textContent = node.content == null ? "" : String(node.content);
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
    case "baseline":
      return "baseline";
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

function dimensionValue(value: Json | undefined): number | null {
  if (!isObject(value) || value.mode !== "fixed") return null;
  const raw = cssLength(value.value);
  if (!raw) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}
