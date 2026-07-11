import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getJournal, getJournalEntry, getPins, getReleases } from "@/lib/data";
import {
  CUSTODY_EXPLANATION,
  CUSTODY_LABEL,
  WITNESS_EXPLANATION,
  WITNESS_LABEL,
  deriveRowStatus,
} from "@/lib/status";
import { citeJournalEntry } from "@/lib/citation";
import { CitationSlip } from "@/components/CitationSlip";
import { Stamp } from "@/components/Stamp";
import {
  formatBytes,
  formatPeriod,
  formatUtc,
  formatValueWithUnit,
} from "@/lib/format";
import { seriesId } from "@/lib/series";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: decodeURIComponent(id) };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

export default async function JournalFactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = getJournalEntry(decodeURIComponent(id));
  if (!entry) notFound();

  const journal = getJournal();
  const releases = getReleases().map((r) => r.manifest);
  const pins = getPins();
  const status = deriveRowStatus(entry, releases);
  const headRelease = releases[releases.length - 1];
  const citation = citeJournalEntry(
    entry,
    pins,
    journal.length,
    headRelease.releaseIndex,
  );
  const { row } = entry;

  const concept = row.measure.source_concept ?? row.measure.concept;
  const siblings = journal.filter(
    (e) =>
      e.row.source_record_id !== row.source_record_id &&
      (e.row.measure.source_concept ?? e.row.measure.concept) === concept &&
      e.row.geography.id === row.geography.id,
  );
  const samePeriod = siblings.filter(
    (e) => String(e.row.period.value) === String(row.period.value),
  );

  return (
    <div className="max-w-4xl">
      <p className="font-mono text-xs text-text-tertiary">
        journal line {entry.line} of {journal.length}
      </p>
      <h1 className="mt-1 break-all font-mono text-xl sm:text-2xl">
        {row.source_record_id}
      </h1>
      <p className="mt-3 max-w-3xl text-text-secondary">{row.label}</p>

      <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="font-mono text-3xl">
          {formatValueWithUnit(row.value, row.measure.unit)}
        </span>
        <span className="text-text-secondary">
          {formatPeriod(row.period.type, row.period.value)} ·{" "}
          {row.geography.name ?? row.geography.id}
        </span>
      </div>

      <CitationSlip citation={citation} />

      <section aria-labelledby="witness-heading" className="mt-8">
        <h2 id="witness-heading" className="text-lg">
          Witness status
        </h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <Stamp tone={status.witness === "witnessed_append" ? "witness" : status.witness === "in_witnessed_state" ? "neutral" : "open"}>
            {WITNESS_LABEL[status.witness]}
          </Stamp>
          {status.custody ? (
            <Stamp tone={status.custody === "rewritten_in_place" ? "flag" : "neutral"}>
              {CUSTODY_LABEL[status.custody] ?? status.custody}
            </Stamp>
          ) : null}
          {status.inImmutablePrefix ? (
            <Stamp tone="neutral">Immutable prefix</Stamp>
          ) : null}
        </div>
        <p className="mt-3 max-w-3xl text-sm text-text-secondary">
          {WITNESS_EXPLANATION[status.witness]}
        </p>
        {status.custody && CUSTODY_EXPLANATION[status.custody] ? (
          <p className="mt-2 max-w-3xl text-sm text-text-secondary">
            {CUSTODY_EXPLANATION[status.custody]}
          </p>
        ) : null}
        {entry.availability ? (
          <dl className="field-table mt-4">
            <Field label="Accepted (recorded)">
              <span className="font-mono text-sm">
                {formatUtc(entry.availability.acceptedAtUtc)}
              </span>
              {!status.acceptanceTimeWitnessed ? (
                <span className="block text-xs text-text-tertiary">
                  Recorded from git history; not independently witnessed. The
                  genesis receipts bound only when the full state existed.
                </span>
              ) : null}
            </Field>
            <Field label="Accepting commit">
              <code>{entry.availability.acceptedCommit}</code>
            </Field>
            <Field label="Line hash">
              <code>{entry.availability.lineSha256}</code>
            </Field>
          </dl>
        ) : null}
      </section>

      <section aria-labelledby="version-heading" className="mt-8">
        <h2 id="version-heading" className="text-lg">
          Version
        </h2>
        {row.assertionVersion ? (
          <dl className="field-table mt-3">
            <Field label="Assertion version">
              <code>{row.assertionVersion.id}</code>
            </Field>
            <Field label="Supersedes">
              {row.assertionVersion.supersedes ? (
                <code>{row.assertionVersion.supersedes}</code>
              ) : (
                "Nothing — this is the first version of this assertion."
              )}
            </Field>
          </dl>
        ) : (
          <p className="mt-2 max-w-3xl text-sm text-text-secondary">
            This row predates assertion versioning (introduced 2026-07-10).
            Corrections to it would append a new row whose{" "}
            <code>assertionVersion.supersedes</code> names this row’s
            recomputed content hash; the row itself is never edited. No
            correction has been recorded.
          </p>
        )}
      </section>

      <section aria-labelledby="provenance-heading" className="mt-8">
        <h2 id="provenance-heading" className="text-lg">
          Provenance
        </h2>
        <dl className="field-table mt-3">
          <Field label="First print observed">{row.observed_at}</Field>
          <Field label="Source">{row.source.source_name}</Field>
          {row.source.source_table ? (
            <Field label="Source table">{row.source.source_table}</Field>
          ) : null}
          {row.source.url ? (
            <Field label="Source URL">
              <a href={row.source.url} rel="noreferrer" className="break-all">
                {row.source.url}
              </a>
            </Field>
          ) : null}
          {row.source.vintage ? (
            <Field label="Vintage">
              <code>{row.source.vintage}</code>
            </Field>
          ) : null}
          {row.source.extracted_at ? (
            <Field label="Extracted">{row.source.extracted_at}</Field>
          ) : null}
          {row.source.extraction_method ? (
            <Field label="Extraction method">{row.source.extraction_method}</Field>
          ) : null}
          <Field label="Concept">
            <code>{row.measure.concept}</code>
          </Field>
          {row.measure.concept_authority ? (
            <Field label="Concept authority">{row.measure.concept_authority}</Field>
          ) : null}
          {row.measure.concept_evidence_url ? (
            <Field label="Concept evidence">
              <a
                href={row.measure.concept_evidence_url}
                rel="noreferrer"
                className="break-all"
              >
                {row.measure.concept_evidence_url}
              </a>
            </Field>
          ) : null}
          <Field label="Entity">
            {row.entity.name} ({row.entity.role})
          </Field>
          <Field label="Aggregation">{row.aggregation.method}</Field>
          {row.filters && Object.keys(row.filters).length ? (
            <Field label="Filters">
              <code>{JSON.stringify(row.filters)}</code>
            </Field>
          ) : null}
          {row.retrievedAt ? (
            <Field label="Retrieved">
              <span className="font-mono text-sm">{formatUtc(row.retrievedAt)}</span>
            </Field>
          ) : null}
          {row.ledgerRepoSha ? (
            <Field label="Ledger repo at capture">
              <code>{row.ledgerRepoSha}</code>
            </Field>
          ) : null}
        </dl>
        {row.responseArchive ? (
          <div className="mt-4 border border-border-soft bg-paper p-4">
            <h3 className="text-sm font-medium">Archived source response</h3>
            <p className="mt-1 text-xs text-text-tertiary">
              The resolver archived the exact bytes it read, in the brier
              records tree.
            </p>
            <dl className="field-table mt-2 text-sm">
              <Field label="Path">
                <code className="break-all">{row.responseArchive.path}</code>
              </Field>
              <Field label="SHA-256">
                <code className="break-all">{row.responseArchive.sha256}</code>
              </Field>
              <Field label="Size">{formatBytes(row.responseArchive.bytes)}</Field>
            </dl>
          </div>
        ) : null}
      </section>

      {samePeriod.length > 0 || siblings.length > 0 ? (
        <section aria-labelledby="related-heading" className="mt-8">
          <h2 id="related-heading" className="text-lg">
            Same series
          </h2>
          {samePeriod.length > 0 ? (
            <p className="mt-2 text-sm text-text-secondary">
              {samePeriod.length} other observation
              {samePeriod.length === 1 ? "" : "s"} of this series and period:
            </p>
          ) : null}
          <ul className="mt-2 space-y-1 text-sm">
            {samePeriod.map((e) => (
              <li key={e.row.source_record_id}>
                <Link
                  href={`/journal/${encodeURIComponent(e.row.source_record_id)}`}
                  className="record-id"
                >
                  {e.row.source_record_id}
                </Link>{" "}
                <span className="font-mono">
                  = {formatValueWithUnit(e.row.value, e.row.measure.unit)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm">
            <Link
              href={`/revisions#${encodeURIComponent(seriesId(concept, row.geography.id))}`}
            >
              All periods of this series →
            </Link>
          </p>
        </section>
      ) : null}

      <details className="mt-8">
        <summary className="cursor-pointer text-sm text-text-secondary">
          Raw journal row (JSON)
        </summary>
        <pre className="mt-2 overflow-x-auto border border-border-soft bg-paper p-4 text-xs leading-5">
          {JSON.stringify(row, null, 1)}
        </pre>
      </details>

      <p className="mt-8 font-mono text-xs text-text-tertiary">
        Read this fact as JSON:{" "}
        <Link href={`/api/journal/${encodeURIComponent(row.source_record_id)}`}>
          /api/journal/{row.source_record_id}
        </Link>
      </p>
    </div>
  );
}
