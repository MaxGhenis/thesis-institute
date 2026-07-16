// Row shapes for the two fact populations the app serves. Fields mirror the
// upstream schemas; optional fields are absent on legacy journal rows.

export interface JournalPeriod {
  type: string;
  value: string | number;
}

export interface JournalGeography {
  level: string;
  id: string;
  vintage?: string;
  name?: string;
}

export interface JournalMeasure {
  concept: string;
  unit: string;
  source_concept?: string;
  concept_relation?: string;
  concept_authority?: string;
  concept_evidence_url?: string;
  concept_evidence_notes?: string;
}

export interface JournalSource {
  source_name: string;
  source_table?: string;
  source_file?: string;
  url?: string;
  vintage?: string;
  extracted_at?: string;
  extraction_method?: string;
  method_notes?: string;
}

export interface ResponseArchive {
  path: string;
  sha256: string;
  bytes: number;
  gzipSha256?: string;
  gzipBytes?: number;
  contentEncoding?: string;
}

export interface AssertionVersion {
  id: string;
  supersedes: string | null;
}

export interface JournalRow {
  source_record_id: string;
  label: string;
  value: number;
  observed_at: string;
  period: JournalPeriod;
  domain: string;
  geography: JournalGeography;
  entity: { name: string; role: string };
  measure: JournalMeasure;
  aggregation: { method: string };
  filters?: Record<string, string>;
  source: JournalSource;
  source_row_keys?: string[];
  source_cell_keys?: string[];
  ledgerRepoSha?: string;
  sourceVintage?: string;
  retrievedAt?: string;
  responseArchive?: ResponseArchive;
  assertionVersion?: AssertionVersion;
}

export interface AvailabilityRow {
  acceptedAtUtc: string;
  acceptedCommit: string;
  acceptedSequence: number;
  custody: string; // "append_derived" | "rewritten_in_place" (open enum)
  lineSha256: string;
  sourceRecordId: string;
}

export interface AvailabilityIndex {
  schemaVersion: string;
  repo: string;
  branch: string;
  headSha: string;
  jsonlSha256: string;
  legacyQuarantineLineCount: number;
  historyAnomalies: {
    commit: string;
    kind: string;
    line: number;
    sourceRecordId: string;
  }[];
  rows: AvailabilityRow[];
}

/** A journal row joined with its availability record and 1-based line number. */
export interface JournalEntry {
  line: number;
  row: JournalRow;
  availability: AvailabilityRow | null;
  inImmutablePrefix: boolean;
}

export interface ReleaseManifest {
  schemaVersion: string;
  releaseIndex: number;
  previousManifestSha256: string | null;
  createdAtUtc: string;
  producer: { repo: string; branch: string };
  state: {
    path: string;
    jsonlSha256: string;
    lineCount: number;
    immutablePrefixSha256: string;
  };
  append: {
    previousLineCount: number;
    appendedRowCount: number;
    appendedBytesSha256: string;
  } | null;
}

export interface StoreFactSlim {
  k: string; // aggregate_fact_key hash (prefix "ledger.aggregate_fact.v2:" stripped)
  label: string;
  v: number | null;
  u: string | null;
  s: string | null; // value_scale
  pt: string | null; // period type
  pv: string | number | null; // period value
  g: string | null; // geography id
  gl: string | null; // geography level
  gn: string | null; // geography name
  pkg: string; // source package id
  src: string | null; // source_name
  c: string | null; // source_concept
  a: string | null; // assertion
}

export interface StoreFactFull {
  schema_version: string;
  aggregate_fact_key: string;
  semantic_fact_key: string;
  legacy_fact_key?: string;
  observed_measure_key?: string;
  source_release_key?: string;
  source_series_key?: string;
  dimension_set_key?: string;
  universe_constraint_set_key?: string;
  assertion: string;
  value: number;
  value_type?: string;
  label: string;
  aggregation: { method: string };
  period: { type: string; value: string | number };
  geography: { id: string; level: string; vintage?: string; name?: string };
  entity: { name: string; role: string };
  dimensions?: Record<string, string>;
  observed_measure?: {
    source_concept?: string;
    source_measure_id?: string;
    source_name?: string;
    source_table?: string;
    unit?: string;
    value_scale?: string;
  };
  concept_alignment?: Record<string, unknown>;
  universe_constraints?: unknown[];
  layout?: Record<string, unknown>;
  lineage?: {
    source_record_id?: string;
    source_cell_keys?: string[];
    source_row_keys?: string[];
  };
  source?: Record<string, unknown>;
}

export interface RegistryPackage {
  package_id: string;
  built: boolean;
  valid?: boolean;
  skip_reason?: string;
  label?: string;
  authority?: string;
  source_table?: string;
  extraction_method?: string;
  extracted_at?: string;
  spec_path?: string;
  counts?: Record<string, number>;
  facts?: number;
  manifest?: {
    source_page?: string;
    table?: string;
    dataset?: string;
    files: {
      year: string | number;
      filename?: string;
      source_url?: string;
      sha256?: string;
      size_bytes?: number;
      fetched_at?: string;
    }[];
  };
}

export interface Registry {
  schemaVersion: string;
  year: number;
  packages: RegistryPackage[];
  packageFiles: Record<string, { facts: number; bytes: number; sha256: string }>;
}

export interface Pins {
  schemaVersion: string;
  retrievedAtUtc: string;
  journal: {
    repo: string;
    branch: string;
    commit: string;
    jsonlSha256: string;
    lineCount: number;
  };
  availability: {
    repo: string;
    commit: string;
    path: string;
    sha256: string;
  };
  bundle: {
    repo: string;
    branch: string;
    commit: string;
    command: string;
    year: number;
    factCount: number;
    packageCount: number;
    skippedPackageCount: number;
    builtAtUtc: string;
  };
}
