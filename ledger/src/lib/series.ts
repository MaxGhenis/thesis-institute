// Series grouping over journal entries. A series is the stream of
// observations that share a source concept and geography; within a series,
// observations of the same period form a vintage group (first print plus any
// later captures or revisions).

import type { JournalEntry } from "./types";

export interface VintageGroup {
  period: string;
  entries: JournalEntry[]; // ordered by acceptance sequence
}

export interface Series {
  id: string; // concept|geo composite used in URLs and anchors
  concept: string;
  authority: string | null;
  geographyId: string;
  geographyName: string;
  unit: string;
  entryCount: number;
  firstObservedAt: string;
  lastObservedAt: string;
  lastAcceptedAtUtc: string | null;
  periods: VintageGroup[];
}

function conceptOf(e: JournalEntry): string {
  return e.row.measure.source_concept ?? e.row.measure.concept;
}

export function seriesId(concept: string, geographyId: string): string {
  return `${concept}@${geographyId}`;
}

export function buildSeries(entries: JournalEntry[]): Series[] {
  const groups = new Map<string, JournalEntry[]>();
  for (const e of entries) {
    const key = seriesId(conceptOf(e), e.row.geography.id);
    const list = groups.get(key);
    if (list) list.push(e);
    else groups.set(key, [e]);
  }
  const out: Series[] = [];
  for (const [id, list] of groups) {
    const sorted = [...list].sort(
      (a, b) =>
        (a.availability?.acceptedSequence ?? a.line) -
        (b.availability?.acceptedSequence ?? b.line),
    );
    const byPeriod = new Map<string, JournalEntry[]>();
    for (const e of sorted) {
      const p = String(e.row.period.value);
      const periodList = byPeriod.get(p);
      if (periodList) periodList.push(e);
      else byPeriod.set(p, [e]);
    }
    const observedDates = sorted.map((e) => e.row.observed_at).sort();
    const accepted = sorted
      .map((e) => e.availability?.acceptedAtUtc)
      .filter((x): x is string => Boolean(x))
      .sort();
    const first = sorted[0];
    out.push({
      id,
      concept: conceptOf(first),
      authority: first.row.measure.concept_authority ?? null,
      geographyId: first.row.geography.id,
      geographyName: first.row.geography.name ?? first.row.geography.id,
      unit: first.row.measure.unit,
      entryCount: sorted.length,
      firstObservedAt: observedDates[0],
      lastObservedAt: observedDates[observedDates.length - 1],
      lastAcceptedAtUtc: accepted.length ? accepted[accepted.length - 1] : null,
      periods: [...byPeriod.entries()]
        .map(([period, list]) => ({ period, entries: list }))
        .sort((a, b) => a.period.localeCompare(b.period)),
    });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

/** Groups with more than one observation for the same series and period. */
export function multiObservationGroups(
  series: Series[],
): { series: Series; group: VintageGroup }[] {
  const out: { series: Series; group: VintageGroup }[] = [];
  for (const s of series) {
    for (const g of s.periods) {
      if (g.entries.length > 1) out.push({ series: s, group: g });
    }
  }
  return out;
}
