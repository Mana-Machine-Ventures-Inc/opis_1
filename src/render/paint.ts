import { isObject } from "../core/expressions.ts";
import type { Json } from "../core/types.ts";

export function cssLength(value: Json | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "number") return value === 0 ? "0px" : `${value}px`;
  if (typeof value === "string") return value;
  return null;
}

export function applyPaint(el: HTMLElement, style: Json | undefined, node: { [key: string]: Json } = {}) {
  if (node.rotation != null) {
    const deg = Number(node.rotation);
    if (Number.isFinite(deg) && deg !== 0) {
      el.style.transform = [el.style.transform, `rotate(${deg}deg)`].filter(Boolean).join(" ");
    }
  }

  if (!isObject(style)) {
    applyMediaFit(el, node);
    applyTextOverflow(el, node);
    return;
  }

  if (typeof style.color === "string") el.style.color = style.color;
  if (style.opacity != null) el.style.opacity = String(style.opacity);
  if (typeof style.mix === "string") el.style.mixBlendMode = cssBlend(style.mix);

  applyRadius(el, style.radius, style.cornerSmoothing);
  applyFills(el, style, node);
  applyStroke(el, style.stroke ?? (Array.isArray(style.strokes) ? style.strokes[style.strokes.length - 1] : undefined));
  applyShadows(el, style);
  applyBlur(el, style);
  applyNoise(el, style.noise);
  applyTypography(el, style.typography);
  applyMediaFit(el, node);
  applyImageAdjust(el, style.adjust ?? node.adjust);
  applyTextOverflow(el, node);
}

export function applyTextOverflow(el: HTMLElement, node: { [key: string]: Json }) {
  const run = el.querySelector(".opis-text-run") as HTMLElement | null;
  const target = run ?? el;
  const maxLines = node.maxLines == null ? null : Number(node.maxLines);
  const truncate = typeof node.truncate === "string" ? node.truncate : maxLines != null ? "end" : null;
  if (maxLines != null && Number.isFinite(maxLines) && maxLines > 0) {
    target.style.display = "-webkit-box";
    target.style.webkitBoxOrient = "vertical";
    target.style.webkitLineClamp = String(Math.max(1, Math.round(maxLines)));
    target.style.overflow = "hidden";
    if (truncate === "start") target.style.textOverflow = "ellipsis";
  } else if (truncate === "end") {
    target.style.whiteSpace = "nowrap";
    target.style.overflow = "hidden";
    target.style.textOverflow = "ellipsis";
  } else if (truncate === "start") {
    target.style.whiteSpace = "nowrap";
    target.style.overflow = "hidden";
    target.style.textOverflow = "ellipsis";
    target.style.direction = "rtl";
    target.style.textAlign = "left";
  }
}

export function applyMediaFit(el: HTMLElement, node: { [key: string]: Json }) {
  if (node.type !== "media") return;
  const fit = typeof node.fit === "string" ? node.fit : "crop";
  const source = typeof node.source === "string" ? node.source : null;
  const kind =
    node.mediaKind === "video" || (source != null && /\.(mp4|webm|mov)(\?|$)/i.test(source))
      ? "video"
      : "image";
  if (!source) return;

  el.style.position = el.style.position || "relative";
  el.style.overflow = el.style.overflow || "hidden";

  if (kind === "video") {
    const video = document.createElement("video");
    video.src = source;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = true;
    video.setAttribute("aria-hidden", "true");
    sizeMedia(video, fit);
    el.prepend(video);
    return;
  }

  const img = document.createElement("img");
  img.src = source;
  img.alt = "";
  img.setAttribute("aria-hidden", "true");
  sizeMedia(img, fit);
  if (fit === "tile") {
    el.style.backgroundImage = `url(${JSON.stringify(source).slice(1, -1)})`;
    el.style.backgroundRepeat = "repeat";
    el.style.backgroundSize = "auto";
    return;
  }
  el.prepend(img);
}

function sizeMedia(media: HTMLElement, fit: string) {
  media.style.position = "absolute";
  media.style.inset = "0";
  media.style.width = "100%";
  media.style.height = "100%";
  if (fit === "fill") media.style.objectFit = "fill";
  else if (fit === "fit") media.style.objectFit = "contain";
  else media.style.objectFit = "cover";
}

function applyRadius(el: HTMLElement, radius: Json | undefined, smoothing: Json | undefined) {
  if (radius == null) return;
  if (typeof radius === "number" || typeof radius === "string") {
    el.style.borderRadius = cssLength(radius) ?? "";
  } else if (isObject(radius)) {
    const ss = cssLength(radius.startStart ?? radius.topLeft);
    const se = cssLength(radius.startEnd ?? radius.topRight);
    const ee = cssLength(radius.endEnd ?? radius.bottomRight);
    const es = cssLength(radius.endStart ?? radius.bottomLeft);
    el.style.borderStartStartRadius = ss ?? "";
    el.style.borderStartEndRadius = se ?? "";
    el.style.borderEndEndRadius = ee ?? "";
    el.style.borderEndStartRadius = es ?? "";
  }
  const smooth = smoothing == null ? null : Number(smoothing);
  if (smooth != null && Number.isFinite(smooth) && smooth > 0) {
    el.style.setProperty("corner-shape", smooth >= 0.5 ? "squircle" : `superellipse(${2 - smooth})`);
  }
}

function applyFills(el: HTMLElement, style: { [key: string]: Json }, node: { [key: string]: Json }) {
  const layers: FillLayer[] = [];
  if (typeof style.background === "string" && style.background.trim()) {
    layers.push(fillFromShorthand(style.background));
  } else if (isObject(style.background) || Array.isArray(style.background)) {
    // match-resolved object treated below via fills
  }
  const fills = style.fills;
  if (Array.isArray(fills)) {
    for (const item of fills) {
      if (!isObject(item) || item.hidden === true) continue;
      layers.push(describeFill(item));
    }
  } else if (isObject(style.background) && typeof style.background.type === "string") {
    layers.push(describeFill(style.background));
  }

  if (layers.length === 0) return;

  const images: string[] = [];
  const sizes: string[] = [];
  const positions: string[] = [];
  const repeats: string[] = [];
  const blends: string[] = [];
  let solid: string | null = null;
  for (const layer of layers) {
    if (layer.kind === "solid") {
      solid = layer.image;
      continue;
    }
    images.push(layer.image);
    sizes.push(layer.size);
    positions.push(layer.position);
    repeats.push(layer.repeat);
    blends.push(layer.blend);
  }
  // CSS paints first image on top; OPIS paints first fill back-most.
  images.reverse();
  sizes.reverse();
  positions.reverse();
  repeats.reverse();
  blends.reverse();
  if (solid) el.style.backgroundColor = solid;
  if (images.length > 0) {
    el.style.backgroundImage = images.join(", ");
    el.style.backgroundSize = sizes.join(", ");
    el.style.backgroundPosition = positions.join(", ");
    el.style.backgroundRepeat = repeats.join(", ");
    if (blends.some((item) => item !== "normal")) el.style.backgroundBlendMode = blends.join(", ");
  }
  if (node.type === "media" && !node.source) {
    el.style.backgroundClip = "padding-box";
  }
}

type FillLayer = {
  kind: "solid" | "image";
  image: string;
  size: string;
  position: string;
  repeat: string;
  blend: string;
};

function fillFromShorthand(value: string): FillLayer {
  if (value.includes("gradient(") || value.startsWith("url(")) {
    return {
      kind: "image",
      image: value,
      size: "cover",
      position: "center",
      repeat: "no-repeat",
      blend: "normal",
    };
  }
  return { kind: "solid", image: value, size: "auto", position: "0 0", repeat: "repeat", blend: "normal" };
}

function describeFill(fill: { [key: string]: Json }): FillLayer {
  const blend = typeof fill.mix === "string" ? cssBlend(fill.mix) : "normal";
  const opacity = fill.opacity == null ? 1 : Number(fill.opacity);
  const type = String(fill.type ?? "solid");
  if (type === "solid") {
    return {
      kind: "solid",
      image: withAlpha(String(fill.color ?? "transparent"), opacity),
      size: "auto",
      position: "0 0",
      repeat: "repeat",
      blend,
    };
  }
  if (type === "linearGradient") {
    const angle = 90 + Number(fill.angle ?? 0);
    return {
      kind: "image",
      image: `linear-gradient(${angle}deg, ${stopList(fill.stops, opacity)})`,
      size: "cover",
      position: "center",
      repeat: "no-repeat",
      blend,
    };
  }
  if (type === "radialGradient" || type === "diamondGradient") {
    const cx = percent(fill.cx, 50);
    const cy = percent(fill.cy, 50);
    return {
      kind: "image",
      image: `radial-gradient(circle at ${cx} ${cy}, ${stopList(fill.stops, opacity)})`,
      size: "cover",
      position: "center",
      repeat: "no-repeat",
      blend,
    };
  }
  if (type === "angularGradient") {
    const angle = Number(fill.angle ?? 0);
    const cx = percent(fill.cx, 50);
    const cy = percent(fill.cy, 50);
    return {
      kind: "image",
      image: `conic-gradient(from ${angle}deg at ${cx} ${cy}, ${stopList(fill.stops, opacity)})`,
      size: "cover",
      position: "center",
      repeat: "no-repeat",
      blend,
    };
  }
  if (type === "image" || type === "video") {
    const source = String(fill.source ?? "");
    const fit = String(fill.fit ?? "crop");
    return {
      kind: "image",
      image: source ? `url(${JSON.stringify(source)})` : "none",
      size: fit === "fill" ? "100% 100%" : fit === "fit" ? "contain" : fit === "tile" ? "auto" : "cover",
      position: "center",
      repeat: fit === "tile" ? "repeat" : "no-repeat",
      blend,
    };
  }
  if (typeof fill.color === "string") return fillFromShorthand(fill.color);
  return fillFromShorthand("transparent");
}

function stopList(stops: Json | undefined, opacity: number): string {
  if (!Array.isArray(stops) || stops.length === 0) return "transparent 0%, transparent 100%";
  return stops
    .map((stop) => {
      if (!isObject(stop)) return "transparent 0%";
      const color = withAlpha(String(stop.color ?? "transparent"), opacity);
      const pos = stop.position == null ? "" : ` ${Number(stop.position) * 100}%`;
      return `${color}${pos}`;
    })
    .join(", ");
}

function percent(value: Json | undefined, fallback: number): string {
  if (value == null) return `${fallback}%`;
  const n = Number(value);
  if (!Number.isFinite(n)) return `${fallback}%`;
  return n <= 1 ? `${n * 100}%` : `${n}%`;
}

function applyStroke(el: HTMLElement, stroke: Json | undefined) {
  if (stroke == null) return;
  if (typeof stroke === "string") {
    el.style.border = `1px solid ${stroke}`;
    el.style.boxSizing = "border-box";
    return;
  }
  if (!isObject(stroke) || stroke.hidden === true) return;
  const color = typeof stroke.color === "string" ? stroke.color : "currentColor";
  const align = typeof stroke.align === "string" ? stroke.align : "inside";
  const dash = stroke.dash;
  const style = Array.isArray(dash) || dash === true ? "dashed" : "solid";
  const widths = strokeWidths(stroke.width);
  if (align === "outside") {
    const max = Math.max(widths.top, widths.right, widths.bottom, widths.left);
    el.style.boxShadow = joinShadows(el.style.boxShadow, `0 0 0 ${max}px ${color}`);
    return;
  }
  if (align === "center") {
    el.style.borderTop = `${widths.top / 2}px ${style} ${color}`;
    el.style.borderRight = `${widths.right / 2}px ${style} ${color}`;
    el.style.borderBottom = `${widths.bottom / 2}px ${style} ${color}`;
    el.style.borderLeft = `${widths.left / 2}px ${style} ${color}`;
    el.style.boxSizing = "border-box";
    const max = Math.max(widths.top, widths.right, widths.bottom, widths.left);
    el.style.boxShadow = joinShadows(el.style.boxShadow, `0 0 0 ${max / 2}px ${color}`);
    return;
  }
  el.style.borderTop = `${widths.top}px ${style} ${color}`;
  el.style.borderRight = `${widths.right}px ${style} ${color}`;
  el.style.borderBottom = `${widths.bottom}px ${style} ${color}`;
  el.style.borderLeft = `${widths.left}px ${style} ${color}`;
  el.style.boxSizing = "border-box";
}

function strokeWidths(width: Json | undefined): { top: number; right: number; bottom: number; left: number } {
  if (width == null) return { top: 1, right: 1, bottom: 1, left: 1 };
  if (typeof width === "number") return { top: width, right: width, bottom: width, left: width };
  if (typeof width === "string") {
    const n = Number.parseFloat(width);
    const v = Number.isFinite(n) ? n : 1;
    return { top: v, right: v, bottom: v, left: v };
  }
  if (!isObject(width)) return { top: 1, right: 1, bottom: 1, left: 1 };
  const block = numLen(width.block);
  const inline = numLen(width.inline);
  return {
    top: numLen(width.top) ?? block ?? 1,
    right: numLen(width.right) ?? inline ?? 1,
    bottom: numLen(width.bottom) ?? block ?? 1,
    left: numLen(width.left) ?? inline ?? 1,
  };
}

function numLen(value: Json | undefined): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function applyShadows(el: HTMLElement, style: { [key: string]: Json }) {
  const parts: string[] = [];
  if (typeof style.shadow === "string" && style.shadow.trim()) parts.push(style.shadow);
  if (typeof style.border === "string" && style.border.trim() && !el.style.border) {
    el.style.border = style.border;
  }
  if (Array.isArray(style.shadows)) {
    for (const item of style.shadows) {
      if (!isObject(item) || item.hidden === true) continue;
      parts.push(shadowCss(item));
    }
  }
  if (parts.length > 0) el.style.boxShadow = joinShadows(el.style.boxShadow, parts.join(", "));
}

function shadowCss(item: { [key: string]: Json }): string {
  const inset = item.kind === "inner" ? "inset " : "";
  const x = cssLength(item.x) ?? "0";
  const y = cssLength(item.y) ?? "0";
  const blur = cssLength(item.blur) ?? "0";
  const spread = cssLength(item.spread ?? 0) ?? "0px";
  const opacity = item.opacity == null ? 1 : Number(item.opacity);
  const color = withAlpha(String(item.color ?? "rgba(15, 23, 42, 0.16)"), opacity);
  return `${inset}${x} ${y} ${blur} ${spread} ${color}`;
}

function applyBlur(el: HTMLElement, style: { [key: string]: Json }) {
  const blur = style.blur;
  const filters: string[] = [];
  if (typeof blur === "number" || typeof blur === "string") {
    const len = cssLength(blur);
    if (len) filters.push(`blur(${len})`);
  } else if (isObject(blur)) {
    if (blur.layer != null) {
      const len = cssLength(blur.layer);
      if (len && len !== "0px") filters.push(`blur(${len})`);
    }
    if (blur.backdrop != null) {
      const len = cssLength(blur.backdrop);
      if (len && len !== "0px") {
        el.style.backdropFilter = `blur(${len}) saturate(1.2)`;
        el.style.setProperty("-webkit-backdrop-filter", el.style.backdropFilter);
      }
    }
    if (isObject(blur.progressive)) applyProgressiveBlur(el, blur.progressive);
  }
  if (filters.length > 0) {
    el.style.filter = [el.style.filter, ...filters].filter(Boolean).join(" ");
  }
}

function applyProgressiveBlur(el: HTMLElement, progressive: { [key: string]: Json }) {
  const start = cssLength(progressive.start) ?? "0px";
  const end = cssLength(progressive.end) ?? "24px";
  const along = progressive.along === "inline" ? "to right" : "to bottom";
  const fromEnd = progressive.from === "end";
  el.style.position = el.style.position || "relative";
  const veil = document.createElement("span");
  veil.className = "opis-progressive-blur";
  veil.setAttribute("aria-hidden", "true");
  veil.style.position = "absolute";
  veil.style.inset = "0";
  veil.style.pointerEvents = "none";
  veil.style.backdropFilter = `blur(${fromEnd ? end : start})`;
  const opaque = fromEnd ? "transparent, black" : "black, transparent";
  veil.style.maskImage = `linear-gradient(${along}, ${opaque})`;
  veil.style.webkitMaskImage = veil.style.maskImage;
  el.append(veil);
  void start;
}

function applyNoise(el: HTMLElement, noise: Json | undefined) {
  if (noise == null) return;
  const opacity = isObject(noise) ? Number(noise.opacity ?? 0.08) : Number(noise);
  if (!Number.isFinite(opacity) || opacity <= 0) return;
  el.style.position = el.style.position || "relative";
  const grain = document.createElement("span");
  grain.className = "opis-noise";
  grain.setAttribute("aria-hidden", "true");
  grain.style.position = "absolute";
  grain.style.inset = "0";
  grain.style.pointerEvents = "none";
  grain.style.opacity = String(opacity);
  grain.style.backgroundImage =
    'url("data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2264%22 height=%2264%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%222%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>")';
  grain.style.backgroundSize = "64px 64px";
  grain.style.mixBlendMode = "overlay";
  el.append(grain);
}

function applyTypography(el: HTMLElement, typography: Json | undefined) {
  if (!isObject(typography)) return;
  const type = typography;
  if (typeof type.fontFamily === "string") el.style.fontFamily = type.fontFamily;
  if (type.fontSize != null) el.style.fontSize = cssLength(type.fontSize) ?? "";
  if (type.fontWeight != null) el.style.fontWeight = String(type.fontWeight);
  if (type.lineHeight != null) el.style.lineHeight = String(type.lineHeight);
  if (type.letterSpacing != null) el.style.letterSpacing = String(type.letterSpacing);
  if (type.fontStyle === "italic") el.style.fontStyle = "italic";
  if (type.decoration === "underline") el.style.textDecoration = "underline";
  if (type.decoration === "lineThrough") el.style.textDecoration = "line-through";
  if (type.case === "uppercase") el.style.textTransform = "uppercase";
  if (type.case === "lowercase") el.style.textTransform = "lowercase";
  if (type.paragraphSpacing != null) el.style.marginBlockEnd = cssLength(type.paragraphSpacing) ?? "";
  if (type.paragraphIndent != null) el.style.textIndent = cssLength(type.paragraphIndent) ?? "";
}

function applyImageAdjust(el: HTMLElement, adjust: Json | undefined) {
  if (!isObject(adjust)) return;
  const filters: string[] = [];
  const exposure = Number(adjust.exposure ?? 0);
  const contrast = Number(adjust.contrast ?? 0);
  const saturation = Number(adjust.saturation ?? 0);
  const temperature = Number(adjust.temperature ?? 0);
  if (exposure) filters.push(`brightness(${1 + exposure})`);
  if (contrast) filters.push(`contrast(${1 + contrast})`);
  if (saturation) filters.push(`saturate(${1 + saturation})`);
  if (temperature) filters.push(`hue-rotate(${temperature * 30}deg)`);
  if (filters.length > 0) el.style.filter = [el.style.filter, ...filters].filter(Boolean).join(" ");
}

function cssBlend(value: string): string {
  if (value === "plus") return "plus-lighter";
  return value;
}

function withAlpha(color: string, opacity: number): string {
  if (!Number.isFinite(opacity) || opacity >= 1) return color;
  if (color.startsWith("rgba(") || color.startsWith("hsla(")) return color;
  if (color.startsWith("rgb(")) return color.replace("rgb(", "rgba(").replace(")", `, ${opacity})`);
  if (color.startsWith("#") && (color.length === 7 || color.length === 4)) {
    const hex = color.length === 4 ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}` : color;
    const r = Number.parseInt(hex.slice(1, 3), 16);
    const g = Number.parseInt(hex.slice(3, 5), 16);
    const b = Number.parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return color;
}

function joinShadows(existing: string, extra: string): string {
  if (!existing) return extra;
  if (!extra) return existing;
  return `${existing}, ${extra}`;
}
