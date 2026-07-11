// Server-side loaders over the vendored snapshot in data/. Every read is from
// files committed at the pins recorded in data/pins.json — the app has no
// live upstream dependency at runtime.

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import type {
  AvailabilityIndex,
  JournalEntry,
  JournalRow,
  Pins,
  Registry,
  ReleaseManifest,
  StoreFactFull,
  StoreFactSlim,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

function read(rel: string): Buffer {
  return fs.readFileSync(path.join(DATA_DIR, rel));
}

function readJson<T>(rel: string): T {
  return JSON.parse(read(rel).toString("utf-8")) as T;
}

function readGzJson<T>(rel: string): T {
  return JSON.parse(zlib.gunzipSync(read(rel)).toString("utf-8")) as T;
}

let pinsCache: Pins | null = null;
export function getPins(): Pins {
  pinsCache ??= readJson<Pins>("pins.json");
  return pinsCache;
}

export function getJournalRawBytes(): Buffer {
  return read("journal/official_observations.jsonl");
}

export function getImmutablePrefixRawBytes(): Buffer {
  return read("journal/immutable_prefix.json");
}

let availabilityCache: AvailabilityIndex | null = null;
export function getAvailability(): AvailabilityIndex {
  availabilityCache ??= readJson<AvailabilityIndex>("journal/availability.json");
  return availabilityCache;
}

let journalCache: JournalEntry[] | null = null;
export function getJournal(): JournalEntry[] {
  if (journalCache) return journalCache;
  const availability = getAvailability();
  const prefix = JSON.parse(getImmutablePrefixRawBytes().toString("utf-8")) as {
    prefixLineCount: number;
  };
  const lines = getJournalRawBytes().toString("utf-8").split("\n").filter(Boolean);
  journalCache = lines.map((text, i) => {
    const row = JSON.parse(text) as JournalRow;
    const avail = availability.rows[i] ?? null;
    if (avail && avail.sourceRecordId !== row.source_record_id) {
      throw new Error(
        `availability index misaligned at line ${i + 1}: ` +
          `${avail.sourceRecordId} != ${row.source_record_id}`,
      );
    }
    return {
      line: i + 1,
      row,
      availability: avail,
      inImmutablePrefix: i < prefix.prefixLineCount,
    };
  });
  return journalCache;
}

export function getJournalEntry(sourceRecordId: string): JournalEntry | null {
  return (
    getJournal().find((e) => e.row.source_record_id === sourceRecordId) ?? null
  );
}

export interface ReleaseFileSet {
  stem: string;
  manifest: ReleaseManifest;
  manifestBytes: Buffer;
  files: string[]; // filenames present for this stem
}

let releasesCache: ReleaseFileSet[] | null = null;
export function getReleases(): ReleaseFileSet[] {
  if (releasesCache) return releasesCache;
  const dir = path.join(DATA_DIR, "journal/releases/manifests");
  const names = fs.readdirSync(dir).sort();
  const stems = [...new Set(names.map((n) => n.replace(/\.(json|freetsa\.tsr|digicert\.tsr|producer\.sig)$/, "")))];
  releasesCache = stems.sort().map((stem) => {
    const manifestBytes = fs.readFileSync(path.join(dir, `${stem}.json`));
    return {
      stem,
      manifest: JSON.parse(manifestBytes.toString("utf-8")) as ReleaseManifest,
      manifestBytes,
      files: names.filter((n) => n.startsWith(stem)),
    };
  });
  return releasesCache;
}

export function getReleaseFileBytes(filename: string): Buffer | null {
  // Only serve files that actually exist in the vendored manifests dir.
  if (!/^[0-9]{4}-[0-9a-f]{16}\.(json|freetsa\.tsr|digicert\.tsr|producer\.sig)$/.test(filename)) {
    return null;
  }
  const p = path.join(DATA_DIR, "journal/releases/manifests", filename);
  return fs.existsSync(p) ? fs.readFileSync(p) : null;
}

export function getAnchorBytes(filename: string): Buffer | null {
  if (!/^[a-z0-9-]+\.(pem|pub)$/.test(filename)) return null;
  const p = path.join(DATA_DIR, "journal/releases/anchors", filename);
  return fs.existsSync(p) ? fs.readFileSync(p) : null;
}

export function getReleasesReadme(): string {
  return read("journal/releases/README.md").toString("utf-8");
}

let storeIndexCache: StoreFactSlim[] | null = null;
export function getStoreIndex(): StoreFactSlim[] {
  storeIndexCache ??= readGzJson<StoreFactSlim[]>("store/index.json.gz");
  return storeIndexCache;
}

let keyToPackageCache: Map<string, string> | null = null;
function keyToPackage(): Map<string, string> {
  if (!keyToPackageCache) {
    keyToPackageCache = new Map();
    for (const f of getStoreIndex()) keyToPackageCache.set(f.k, f.pkg);
  }
  return keyToPackageCache;
}

const packageCache = new Map<string, StoreFactFull[]>();
const PACKAGE_CACHE_MAX = 8;
export function getPackageFacts(packageId: string): StoreFactFull[] | null {
  if (packageCache.has(packageId)) return packageCache.get(packageId)!;
  const rel = `store/packages/${packageId}.json.gz`;
  if (!/^[a-z0-9-]+$/.test(packageId)) return null;
  if (!fs.existsSync(path.join(DATA_DIR, rel))) return null;
  const facts = readGzJson<StoreFactFull[]>(rel);
  if (packageCache.size >= PACKAGE_CACHE_MAX) {
    const oldest = packageCache.keys().next().value;
    if (oldest) packageCache.delete(oldest);
  }
  packageCache.set(packageId, facts);
  return facts;
}

export const STORE_KEY_PREFIX = "ledger.aggregate_fact.v2";

export function getStoreFact(
  keyHash: string,
): { fact: StoreFactFull; packageId: string } | null {
  const pkg = keyToPackage().get(keyHash);
  if (!pkg) return null;
  const facts = getPackageFacts(pkg);
  const fact = facts?.find(
    (f) => f.aggregate_fact_key === `${STORE_KEY_PREFIX}:${keyHash}`,
  );
  return fact ? { fact, packageId: pkg } : null;
}

let registryCache: Registry | null = null;
export function getRegistry(): Registry {
  registryCache ??= readJson<Registry>("store/registry.json");
  return registryCache;
}

export function getCoverage(): Record<string, unknown> {
  return readJson<Record<string, unknown>>("store/coverage.json");
}

export function getBuildReport(): {
  year: number;
  errors: { code: string; message: string; source?: string }[];
  warnings: { code: string; message: string; source?: string }[];
  skipped_sources: { source: string; reason: string }[];
  source_package_count: number;
} {
  return readJson("store/report.json");
}
