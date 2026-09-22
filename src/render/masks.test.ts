import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const masksDir = join(dirname(fileURLToPath(import.meta.url)), "../../hosts/html/masks");

describe("HTML host vector mask catalog", () => {
  it("stores real SVG stencil files", () => {
    const files = readdirSync(masksDir).filter((file) => file.endsWith(".svg")).sort();
    expect(files).toEqual(["blob.svg", "star.svg"]);
    for (const file of files) {
      const path = join(masksDir, file);
      expect(existsSync(path), path).toBe(true);
      const svg = readFileSync(path, "utf8");
      expect(svg).toContain("<svg");
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain("viewBox=");
      expect(svg).toContain("<path");
      expect(svg).toContain('fill="#000"');
    }
  });
});
