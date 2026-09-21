import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ICON_NAMES } from "./icons.ts";

const iconsDir = join(dirname(fileURLToPath(import.meta.url)), "../../hosts/html/icons");

describe("HTML host icon catalog", () => {
  it("stores a real SVG file for every catalog name", () => {
    const files = readdirSync(iconsDir).filter((file) => file.endsWith(".svg"));
    expect(files.sort()).toEqual([...ICON_NAMES].map((name) => `${name}.svg`).sort());
    for (const name of ICON_NAMES) {
      const path = join(iconsDir, `${name}.svg`);
      expect(existsSync(path), path).toBe(true);
      const svg = readFileSync(path, "utf8");
      expect(svg).toContain("<svg");
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain("viewBox=");
      expect(svg).not.toContain("<svg><path");
    }
  });
});
