import { describe, expect, it } from "vitest";
import { applyLayerMask, applyPaint } from "./paint.ts";
import type { Json } from "../core/types.ts";

function painted(style: Json, node: { [key: string]: Json } = { type: "stack" }) {
  const bag: Record<string, string> = {};
  const el = {
    style: new Proxy(bag, {
      get(target, key) {
        if (key === "setProperty") {
          return (name: string, value: string) => {
            target[name] = value;
          };
        }
        return target[String(key)] ?? "";
      },
      set(target, key, value) {
        target[String(key)] = String(value);
        return true;
      },
    }),
    querySelector: () => null,
    append() {},
    prepend() {},
  } as unknown as HTMLElement;
  applyPaint(el, style, node);
  return bag;
}

function masked(child: Json) {
  const bag: Record<string, string> = {};
  const el = {
    style: new Proxy(bag, {
      get(target, key) {
        if (key === "setProperty") {
          return (name: string, value: string) => {
            target[name] = value;
          };
        }
        return target[String(key)] ?? "";
      },
      set(target, key, value) {
        target[String(key)] = String(value);
        return true;
      },
    }),
  } as unknown as HTMLElement;
  applyLayerMask(el, child as { [key: string]: Json });
  return bag;
}

describe("appearance paint", () => {
  it("maps logical corners", () => {
    const css = painted({
      radius: { startStart: 4, startEnd: 8, endEnd: 12, endStart: 16 },
    });
    expect(css.borderStartStartRadius).toBe("4px");
    expect(css.borderStartEndRadius).toBe("8px");
    expect(css.borderEndEndRadius).toBe("12px");
    expect(css.borderEndStartRadius).toBe("16px");
  });

  it("emits drop and inner shadows", () => {
    const css = painted({
      shadows: [
        { kind: "drop", x: 0, y: 10, blur: 30, spread: 0, color: "#0f172a", opacity: 0.5 },
        { kind: "inner", x: 0, y: 1, blur: 2, color: "#ffffff" },
      ],
    });
    expect(css.boxShadow).toContain("0px 10px 30px 0px rgba(15, 23, 42, 0.5)");
    expect(css.boxShadow).toContain("inset 0px 1px 2px 0px #ffffff");
  });

  it("builds a linear gradient fill", () => {
    const css = painted({
      fills: [
        {
          type: "linearGradient",
          angle: 180,
          stops: [
            { color: "#0f766e", position: 0 },
            { color: "#4f46e5", position: 1 },
          ],
        },
      ],
    });
    expect(css.backgroundImage).toContain("linear-gradient(270deg");
    expect(css.backgroundImage).toContain("#0f766e 0%");
  });

  it("uses inside stroke as a border", () => {
    const css = painted({
      stroke: { color: "#e2e8f0", width: 2, align: "inside" },
    });
    expect(css.borderTop).toBe("2px solid #e2e8f0");
    expect(css.boxSizing).toBe("border-box");
  });

  it("applies backdrop blur", () => {
    const css = painted({ blur: { backdrop: 20 } });
    expect(css.backdropFilter).toContain("blur(20px)");
  });

  it("applies layer blur", () => {
    const css = painted({ blur: { layer: 8 } });
    expect(css.filter).toContain("blur(8px)");
  });

  it("keeps background and stroke string shorthands", () => {
    const css = painted({
      background: "#fff",
      stroke: "#e2e8f0",
      shadow: "0 8px 16px rgba(0,0,0,0.1)",
    });
    expect(css.backgroundColor).toBe("#fff");
    expect(css.border).toBe("1px solid #e2e8f0");
    expect(css.boxShadow).toBe("0 8px 16px rgba(0,0,0,0.1)");
  });

  it("builds an alpha mask from a radial fill", () => {
    const css = masked({
      mask: "alpha",
      style: {
        fills: [
          {
            type: "radialGradient",
            stops: [
              { color: "#ffffff", position: 0 },
              { color: "#ffffff00", position: 1 },
            ],
          },
        ],
      },
    });
    expect(css.maskImage).toContain("radial-gradient");
    expect(css.maskImage).toContain("#ffffff00");
    expect(css.maskComposite).toBeUndefined();
  });

  it("inverts a mask with exclude compositing", () => {
    const css = masked({
      mask: "inverse",
      style: {
        fills: [{ type: "solid", color: "#ffffff" }],
      },
    });
    expect(css.maskImage).toContain("linear-gradient(#ffffff, #ffffff)");
    expect(css.maskComposite).toBe("exclude");
    expect(css["-webkit-mask-composite"]).toBe("xor");
  });

  it("uses a file URL as an alpha stencil and honors fit", () => {
    const css = masked({
      mask: "alpha",
      source: "/masks/star.svg",
      fit: "fit",
    });
    expect(css.maskImage).toContain("url(\"/masks/star.svg\")");
    expect(css.maskSize).toBe("contain");
    expect(css.maskMode).toBe("alpha");
    expect(css["-webkit-mask-source-type"]).toBe("alpha");
  });

  it("falls back to a geometric clip when the mask has no paint", () => {
    const css = masked({
      mask: true,
      style: { radius: 999 },
    });
    expect(css.overflow).toBe("hidden");
    expect(css.borderRadius).toBe("999px");
    expect(css.maskImage).toBeUndefined();
  });

  it("composes flip and rotation", () => {
    const css = painted({}, { flip: "inline", rotation: 15 });
    expect(css.transform).toContain("scaleX(-1)");
    expect(css.transform).toContain("rotate(15deg)");
  });
});
