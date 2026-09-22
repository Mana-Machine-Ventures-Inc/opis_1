import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const mediaDir = join(dirname(fileURLToPath(import.meta.url)), "../../hosts/html/media");

describe("HTML host media catalog", () => {
  it("stores a real JPEG for the harbor sample", () => {
    const path = join(mediaDir, "harbor.jpg");
    expect(existsSync(path), path).toBe(true);
    const bytes = readFileSync(path);
    expect(bytes[0]).toBe(0xff);
    expect(bytes[1]).toBe(0xd8);
    expect(bytes[2]).toBe(0xff);
    expect(bytes.byteLength).toBeGreaterThan(8_000);
  });
});
