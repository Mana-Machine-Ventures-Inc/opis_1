import { describe, expect, it } from "vitest";
import { applyPaint } from "./paint.ts";
import type { Json } from "../core/types.ts";

function painted(style: Json) {
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
  applyPaint(el, style, { type: "stack" });
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
});
