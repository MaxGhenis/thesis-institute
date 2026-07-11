// Honest witness-status derivation. The words rendered in the UI come from
// here so every page states the same, true thing. Never label anything
// "verified" that a verifier has not verified: acceptance timestamps for rows
// that predate the first witnessed append are recorded from git history, not
// independently witnessed.

import type { JournalEntry, ReleaseManifest } from "./types";

export type RowWitnessStatus =
  | "in_witnessed_state" // row is inside a state some release witnesses
  | "witnessed_append" // row arrived through a witnessed append (release >= 1)
  | "not_witnessed"; // row is beyond the last witnessed state

export interface RowStatus {
  witness: RowWitnessStatus;
  custody: string | null; // availability custody enum, verbatim
  inImmutablePrefix: boolean;
  acceptanceTimeWitnessed: boolean; // true only for rows accepted via witnessed appends
}

export function deriveRowStatus(
  entry: JournalEntry,
  releases: ReleaseManifest[],
): RowStatus {
  const head = releases[releases.length - 1];
  const witnessedLineCount = head?.state.lineCount ?? 0;
  // A row arrived through a witnessed append if some non-genesis release's
  // append block covers its line.
  const arrivedByWitnessedAppend = releases.some(
    (r) =>
      r.append !== null &&
      entry.line > r.append.previousLineCount &&
      entry.line <= r.state.lineCount,
  );
  const witness: RowWitnessStatus = arrivedByWitnessedAppend
    ? "witnessed_append"
    : entry.line <= witnessedLineCount
      ? "in_witnessed_state"
      : "not_witnessed";
  return {
    witness,
    custody: entry.availability?.custody ?? null,
    inImmutablePrefix: entry.inImmutablePrefix,
    acceptanceTimeWitnessed: arrivedByWitnessedAppend,
  };
}

export const WITNESS_LABEL: Record<RowWitnessStatus, string> = {
  in_witnessed_state: "In witnessed state",
  witnessed_append: "Witnessed append",
  not_witnessed: "Not witnessed",
};

export const WITNESS_EXPLANATION: Record<RowWitnessStatus, string> = {
  in_witnessed_state:
    "This row is part of a journal state whose exact bytes are covered by a " +
    "timestamped release manifest. The receipts bound when the state existed, " +
    "not when this row was first recorded.",
  witnessed_append:
    "This row arrived through the gated append flow: the release manifest " +
    "covering its append was timestamped by two RFC 3161 authorities before " +
    "the merge that accepted it.",
  not_witnessed:
    "This row is newer than the last witnessed release and is not yet covered " +
    "by any timestamp receipt.",
};

export const CUSTODY_LABEL: Record<string, string> = {
  append_derived: "Append-derived",
  rewritten_in_place: "Rewritten in place",
};

export const CUSTODY_EXPLANATION: Record<string, string> = {
  append_derived:
    "The row's history in git is append-only: it was added once and its bytes " +
    "never changed afterward.",
  rewritten_in_place:
    "Git history shows this row's bytes were rewritten in place before the " +
    "append-only contract was enforced (2026-07-10). The current bytes are " +
    "frozen in the immutable prefix; the pre-enforcement rewrite is recorded, " +
    "not hidden.",
};

export function journalHeadline(releases: ReleaseManifest[], totalRows: number) {
  const witnessedAppends = releases.filter((r) => r.append !== null).length;
  const head = releases[releases.length - 1];
  return {
    totalRows,
    releases: releases.length,
    witnessedAppends,
    genesisAtUtc: releases[0]?.createdAtUtc ?? null,
    witnessedLineCount: head?.state.lineCount ?? 0,
  };
}
