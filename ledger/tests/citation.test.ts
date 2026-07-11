import { describe, expect, it } from "vitest";
import { citeJournalEntry, citeStoreFact } from "@/lib/citation";
import type { JournalEntry, Pins, StoreFactFull } from "@/lib/types";

const pins: Pins = {
  schemaVersion: "thesis_ledger_app_pins_v1",
  retrievedAtUtc: "2026-07-11T22:42:31Z",
  journal: {
    repo: "PolicyEngine/ledger",
    branch: "codex/thesis-ledger-facts",
    commit: "8470a7ef1ba6d0c14ec2c94e3accb5168282ee33",
    jsonlSha256: "590b71bed9a7fc0354f2449c5e533ed20b508fb3554e395b1bdd283b945f0ea5",
    lineCount: 143,
  },
  availability: {
    repo: "MaxGhenis/brier",
    commit: "5d61dc7473ae0271e02aac6b1e2f5bafc465387b",
    path: "records/ledger/availability.json",
    sha256: "x",
  },
  bundle: {
    repo: "PolicyEngine/ledger",
    branch: "main",
    commit: "57f11986719f8b046b751ceae6bec1480ad47011",
    command: "ledger build-bundle --year 2023",
    year: 2023,
    factCount: 39173,
    packageCount: 58,
    skippedPackageCount: 9,
    builtAtUtc: "2026-07-11T22:50:46Z",
  },
};

const entry: JournalEntry = {
  line: 1,
  inImmutablePrefix: true,
  availability: null,
  row: {
    source_record_id: "bls.ces.total_nonfarm_payroll_change.may_2026.first_print",
    label: "United States May 2026 payroll change",
    value: 172,
    observed_at: "2026-06-05",
    period: { type: "month", value: "2026-05" },
    domain: "total_nonfarm_payroll_employment",
    geography: { level: "country", id: "0100000US", name: "United States" },
    entity: { name: "person", role: "nonfarm_payroll_employee" },
    measure: { concept: "bls.ces.total_nonfarm_payroll_change", unit: "thousands" },
    aggregation: { method: "sum" },
    source: {
      source_name: "bls",
      source_table: "Employment Situation, May 2026",
    },
  },
};

describe("citeJournalEntry", () => {
  it("emits the standard line with id, value, first print, source, and position", () => {
    expect(citeJournalEntry(entry, pins, 143, 0)).toBe(
      "bls.ces.total_nonfarm_payroll_change.may_2026.first_print = 172 thousands (2026-05). " +
        "First print 2026-06-05, bls, Employment Situation, May 2026. " +
        "Thesis Institute Ledger, journal line 1 of 143 (state 590b71be, release 0). " +
        "https://ledger.thesisinstitute.org/journal/bls.ces.total_nonfarm_payroll_change.may_2026.first_print",
    );
  });

  it("renders percent units without a space", () => {
    const pct: JournalEntry = {
      ...entry,
      row: {
        ...entry.row,
        value: 10.62,
        measure: { ...entry.row.measure, unit: "percent" },
      },
    };
    expect(citeJournalEntry(pct, pins, 143, 0)).toContain("= 10.62% (");
  });
});

describe("citeStoreFact", () => {
  it("cites the snapshot pin instead of a journal position", () => {
    const fact: StoreFactFull = {
      schema_version: "ledger.consumer_fact.v1",
      aggregate_fact_key: "ledger.aggregate_fact.v2:3bbbc74992a77a159dcf018d",
      semantic_fact_key: "ledger.semantic_fact.v2:e8925561b23ceda59f07513a",
      assertion: "observation",
      value: 1000,
      label: "test",
      aggregation: { method: "sum" },
      period: { type: "calendar_year", value: 2023 },
      geography: { id: "0100000US", level: "country", name: "United States" },
      entity: { name: "pension_plan", role: "defined_contribution" },
      observed_measure: { unit: "usd", source_name: "bea", source_table: "NIPA" },
    };
    expect(citeStoreFact(fact, "bea-nipa-pension-contributions", pins)).toBe(
      "ledger.aggregate_fact.v2:3bbbc74992a77a159dcf018d = 1,000 USD (CY 2023, United States). " +
        "bea, NIPA, package bea-nipa-pension-contributions. " +
        "Thesis Institute Ledger store snapshot PolicyEngine/ledger@57f11986 (bundle year 2023). " +
        "https://ledger.thesisinstitute.org/store/3bbbc74992a77a159dcf018d",
    );
  });
});
