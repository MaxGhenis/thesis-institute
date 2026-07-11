import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { canonicalStringify } from "@/lib/verify/canonical";

const MANIFEST = path.join(
  __dirname,
  "../data/journal/releases/manifests/0000-307cedbc91de43be.json",
);

describe("canonicalStringify", () => {
  it("reproduces the genesis manifest's exact bytes", () => {
    const bytes = fs.readFileSync(MANIFEST, "utf-8");
    const parsed = JSON.parse(bytes);
    expect(canonicalStringify(parsed) + "\n").toBe(bytes);
  });

  it("sorts keys and serializes scalars like JSON.stringify", () => {
    expect(canonicalStringify({ b: 1, a: [null, true, "x"] })).toBe(
      '{"a":[null,true,"x"],"b":1}',
    );
  });

  it("rejects non-finite numbers", () => {
    expect(() => canonicalStringify({ a: Infinity })).toThrow();
  });
});
