import type { Metadata } from "next";
import Link from "next/link";
import { getJournal, getReleases } from "@/lib/data";
import { PageHeader } from "@/components/PageHeader";
import { Stamp } from "@/components/Stamp";
import { formatPeriod, formatUtc, formatValueWithUnit } from "@/lib/format";
import { journalHeadline } from "@/lib/status";

export const metadata: Metadata = { title: "Journal" };

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const { source } = await searchParams;
  const journal = getJournal();
  const releases = getReleases().map((r) => r.manifest);
  const headline = journalHeadline(releases, journal.length);

  const sources = [...new Set(journal.map((e) => e.row.source.source_name))].sort();
  const entries = source
    ? journal.filter((e) => e.row.source.source_name === source)
    : journal;

  return (
    <div>
      <PageHeader
        title="Journal"
        lede={
          <>
            The append-only journal of first-print observations:{" "}
            {journal.length} rows, in acceptance order. Line numbers are
            permanent — the journal only grows. The first{" "}
            {journal.filter((e) => e.inImmutablePrefix).length} rows form the
            frozen immutable prefix; every row since arrives through the gated
            append flow.
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-text-tertiary">Source:</span>
        <Link
          href="/journal"
          className={!source ? "font-semibold text-text-primary" : ""}
        >
          all
        </Link>
        {sources.map((s) => (
          <Link
            key={s}
            href={`/journal?source=${encodeURIComponent(s)}`}
            className={source === s ? "font-semibold text-text-primary" : ""}
          >
            {s}
          </Link>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Stamp tone="witness">
          state witnessed at genesis {formatUtc(headline.genesisAtUtc).slice(0, 16)} UTC
        </Stamp>
        <Stamp tone="neutral">{headline.witnessedAppends} witnessed appends</Stamp>
      </div>

      <div className="overflow-x-auto">
        <table className="register">
          <thead>
            <tr>
              <th className="lineno" scope="col">
                Line
              </th>
              <th scope="col">Fact</th>
              <th scope="col">Value</th>
              <th scope="col">Period</th>
              <th scope="col">Geography</th>
              <th scope="col">First print</th>
              <th scope="col">Custody</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.row.source_record_id}>
                <td className="lineno">{e.line}</td>
                <td className="max-w-md">
                  <Link
                    href={`/journal/${encodeURIComponent(e.row.source_record_id)}`}
                    className="record-id"
                  >
                    {e.row.source_record_id}
                  </Link>
                </td>
                <td className="whitespace-nowrap font-mono text-[0.8125rem]">
                  {formatValueWithUnit(e.row.value, e.row.measure.unit)}
                </td>
                <td className="whitespace-nowrap">
                  {formatPeriod(e.row.period.type, e.row.period.value)}
                </td>
                <td className="whitespace-nowrap">
                  {e.row.geography.name ?? e.row.geography.id}
                </td>
                <td className="whitespace-nowrap">{e.row.observed_at}</td>
                <td>
                  {e.availability?.custody === "rewritten_in_place" ? (
                    <Stamp tone="flag">rewritten in place</Stamp>
                  ) : e.availability?.custody === "append_derived" ? (
                    <Stamp tone="neutral">append-derived</Stamp>
                  ) : (
                    <Stamp tone="open">unindexed</Stamp>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {source ? (
        <p className="mt-4 text-sm text-text-tertiary">
          {entries.length} of {journal.length} rows shown.
        </p>
      ) : null}
    </div>
  );
}
