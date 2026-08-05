// The citation formats are the product. One standard plain-text line per
// fact, deterministic, containing: fact ID, recorded value, first-print date,
// source, journal position (journal facts) or snapshot pin (store facts),
// and the permalink. Format changes are breaking changes for citers —
// version them.

import type { JournalEntry, Pins, StoreFactFull } from "./types";
import { formatPeriod, formatValueWithUnit } from "./format";

export const SITE_ORIGIN = "https://chronicle.institute";
// draft-2 (2026-08-05): the record renamed Ledger → Chronicle and moved to
// chronicle.institute; the cited-work name and permalink origin changed.
// Field structure is unchanged from draft-1.
export const CITATION_FORMAT_VERSION = "draft-2";

export function journalFactUrl(sourceRecordId: string): string {
  return `${SITE_ORIGIN}/journal/${encodeURIComponent(sourceRecordId)}`;
}

export function storeFactUrl(keyHash: string): string {
  return `${SITE_ORIGIN}/store/${keyHash}`;
}

/**
 * Standard citation for a witnessed-journal observation.
 *
 * Example:
 *   bls.ces.total_nonfarm_payroll_change.may_2026.first_print = 172 thousands
 *   (2026-05). First print 2026-06-05, BLS Employment Situation, May 2026.
 *   Chronicle, journal line 1 of 143 (state 590b71be, release 0).
 *   https://chronicle.institute/journal/bls.ces...first_print
 */
export function citeJournalEntry(
  entry: JournalEntry,
  pins: Pins,
  totalLines: number,
  releaseIndex: number,
): string {
  const { row, line } = entry;
  const value = formatValueWithUnit(row.value, row.measure.unit);
  const period = formatPeriod(row.period.type, row.period.value);
  const source = [row.source.source_name, row.source.source_table]
    .filter(Boolean)
    .join(", ");
  const state = pins.journal.jsonlSha256.slice(0, 8);
  return (
    `${row.source_record_id} = ${value} (${period}). ` +
    `First print ${row.observed_at}, ${source}. ` +
    `Chronicle, journal line ${line} of ${totalLines} ` +
    `(state ${state}, release ${releaseIndex}). ` +
    journalFactUrl(row.source_record_id)
  );
}

/**
 * Standard citation for a source-package store fact. Store facts are not
 * journal entries, so the position field is the pinned store snapshot
 * (ledger commit + bundle year) instead of a journal line.
 */
export function citeStoreFact(
  fact: StoreFactFull,
  packageId: string,
  pins: Pins,
): string {
  const om = fact.observed_measure ?? {};
  const value = formatValueWithUnit(fact.value, om.unit, om.value_scale);
  const period = formatPeriod(fact.period.type, fact.period.value);
  const geo = fact.geography.name ?? fact.geography.id;
  const source = [om.source_name, om.source_table].filter(Boolean).join(", ");
  const keyHash = fact.aggregate_fact_key.split(":", 2)[1];
  return (
    `${fact.aggregate_fact_key} = ${value} (${period}, ${geo}). ` +
    `${source}, package ${packageId}. ` +
    `Chronicle store snapshot ` +
    `${pins.bundle.repo}@${pins.bundle.commit.slice(0, 8)} ` +
    `(bundle year ${pins.bundle.year}). ` +
    storeFactUrl(keyHash)
  );
}
