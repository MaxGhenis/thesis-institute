import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";

// Snapshot invariants: the committed data must be internally consistent and
// match its recorded pins. These run against the real vendored files.

const ROOT = path.join(__dirname, "..");
const pins = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data/pins.json"), "utf-8"),
);

describe("journal snapshot", () => {
  const bytes = fs.readFileSync(
    path.join(ROOT, "data/journal/official_observations.jsonl"),
  );
  const lines = bytes.toString("utf-8").split("\n").filter(Boolean);

  it("matches the pinned state hash and line count", () => {
    const sha = crypto.createHash("sha256").update(bytes).digest("hex");
    expect(sha).toBe(pins.journal.jsonlSha256);
    expect(lines.length).toBe(pins.journal.lineCount);
  });

  it("has unique source_record_ids", () => {
    const ids = lines.map((l) => JSON.parse(l).source_record_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("aligns with the availability index row by row", () => {
    const availability = JSON.parse(
      fs.readFileSync(path.join(ROOT, "data/journal/availability.json"), "utf-8"),
    );
    expect(availability.jsonlSha256).toBe(pins.journal.jsonlSha256);
    expect(availability.rows.length).toBe(lines.length);
    availability.rows.forEach(
      (r: { sourceRecordId: string; lineSha256: string }, i: number) => {
        const row = JSON.parse(lines[i]);
        expect(r.sourceRecordId).toBe(row.source_record_id);
        // lineSha256 hashes the line's bytes without its newline.
        const lineSha = crypto
          .createHash("sha256")
          .update(Buffer.from(lines[i]))
          .digest("hex");
        expect(lineSha).toBe(r.lineSha256);
      },
    );
  });

  it("genesis manifest witnesses exactly this state", () => {
    const manifest = JSON.parse(
      fs.readFileSync(
        path.join(
          ROOT,
          "data/journal/releases/manifests/0000-307cedbc91de43be.json",
        ),
        "utf-8",
      ),
    );
    expect(manifest.state.jsonlSha256).toBe(pins.journal.jsonlSha256);
    expect(manifest.state.lineCount).toBe(pins.journal.lineCount);
  });
});

describe("store snapshot", () => {
  const index = JSON.parse(
    zlib
      .gunzipSync(fs.readFileSync(path.join(ROOT, "data/store/index.json.gz")))
      .toString("utf-8"),
  ) as { k: string; pkg: string }[];

  it("matches the pinned fact count", () => {
    expect(index.length).toBe(pins.bundle.factCount);
  });

  it("has unique aggregate keys", () => {
    expect(new Set(index.map((f) => f.k)).size).toBe(index.length);
  });

  it("every indexed package file exists and registry counts agree", () => {
    const registry = JSON.parse(
      fs.readFileSync(path.join(ROOT, "data/store/registry.json"), "utf-8"),
    );
    const counts = new Map<string, number>();
    for (const f of index) counts.set(f.pkg, (counts.get(f.pkg) ?? 0) + 1);
    expect(counts.size).toBe(pins.bundle.packageCount);
    for (const [pkg, count] of counts) {
      const file = path.join(ROOT, `data/store/packages/${pkg}.json.gz`);
      expect(fs.existsSync(file), pkg).toBe(true);
      expect(registry.packageFiles[pkg]?.facts, pkg).toBe(count);
    }
  });
});
