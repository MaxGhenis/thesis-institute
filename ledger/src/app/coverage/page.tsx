import type { Metadata } from "next";
import Link from "next/link";
import { getCoverage, getJournal, getPins } from "@/lib/data";
import { buildSeries } from "@/lib/series";
import { PageHeader } from "@/components/PageHeader";
import { formatUtc } from "@/lib/format";

export const metadata: Metadata = { title: "Coverage" };

interface CoverageDoc {
  fact_count: number;
  unique_counts: Record<string, number>;
  duplicates: { aggregate_fact_keys: unknown[]; semantic_fact_keys: unknown[] };
  counts: {
    by_source: Record<string, number>;
    by_period: Record<string, number>;
    by_entity: Record<string, number>;
    by_geography: Record<string, number>;
    by_observed_concept: Record<string, number>;
  };
}

function CountTable({
  title,
  data,
  noun,
}: {
  title: string;
  data: Record<string, number>;
  noun: string;
}) {
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1]);
  return (
    <div>
      <h3 className="text-base font-medium">{title}</h3>
      <div className="mt-2 overflow-x-auto">
        <table className="register">
          <thead>
            <tr>
              <th scope="col">{noun}</th>
              <th scope="col">Facts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}>
                <td>
                  <code className="text-[0.8125rem]">{k}</code>
                </td>
                <td className="whitespace-nowrap font-mono text-[0.8125rem]">
                  {v.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CoveragePage() {
  const coverage = getCoverage() as unknown as CoverageDoc;
  const journal = getJournal();
  const pins = getPins();
  const series = buildSeries(journal).sort((a, b) =>
    a.lastObservedAt.localeCompare(b.lastObservedAt),
  );

  return (
    <div>
      <PageHeader
        title="Coverage and staleness"
        lede={
          <>
            What the Ledger tracks and when it last saw each series. Every
            number on this page is computed from the pinned snapshot — nothing
            is estimated.
          </>
        }
      />

      <section aria-labelledby="journal-coverage-heading">
        <h2 id="journal-coverage-heading" className="text-xl">
          Journal series
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-text-secondary">
          The journal tracks {series.length} series, ordered stalest first.
          “Last first print” is the most recent observation date; a stale
          series either left the capture docket or its publisher has not
          released since.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="register">
            <thead>
              <tr>
                <th scope="col">Series</th>
                <th scope="col">Geography</th>
                <th scope="col">Rows</th>
                <th scope="col">First</th>
                <th scope="col">Last first print</th>
                <th scope="col">Last accepted</th>
              </tr>
            </thead>
            <tbody>
              {series.map((s) => (
                <tr key={s.id}>
                  <td className="max-w-md">
                    <Link
                      href={`/revisions#${encodeURIComponent(s.id)}`}
                      className="record-id"
                    >
                      {s.concept}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap">{s.geographyName}</td>
                  <td className="font-mono text-[0.8125rem]">{s.entryCount}</td>
                  <td className="whitespace-nowrap">{s.firstObservedAt}</td>
                  <td className="whitespace-nowrap">{s.lastObservedAt}</td>
                  <td className="whitespace-nowrap text-text-tertiary">
                    {s.lastAcceptedAtUtc
                      ? formatUtc(s.lastAcceptedAtUtc).slice(0, 10)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="store-coverage-heading" className="mt-12">
        <h2 id="store-coverage-heading" className="text-xl">
          Store coverage
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-text-secondary">
          {coverage.fact_count.toLocaleString()} facts in the {pins.bundle.year}{" "}
          bundle: {coverage.unique_counts.semantic_fact_key.toLocaleString()}{" "}
          distinct statistics from{" "}
          {coverage.unique_counts.source_release_key.toLocaleString()} source
          releases across {coverage.unique_counts.source_series_key} source
          series. {coverage.duplicates.semantic_fact_keys.length} statistics
          are asserted by more than one source row — the store keeps every
          assertion and leaves reconciliation to consumers.
        </p>
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <CountTable
            title="Facts by source"
            data={coverage.counts.by_source}
            noun="Source"
          />
          <div className="space-y-8">
            <CountTable
              title="Facts by period"
              data={coverage.counts.by_period}
              noun="Period"
            />
            <CountTable
              title="Facts by entity"
              data={coverage.counts.by_entity}
              noun="Entity"
            />
          </div>
        </div>
        <p className="mt-6 text-sm text-text-tertiary">
          Full coverage report:{" "}
          <Link href="/api/coverage" className="font-mono">
            /api/coverage
          </Link>
        </p>
      </section>
    </div>
  );
}
