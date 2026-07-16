import type { Metadata } from "next";
import Link from "next/link";
import { getJournal } from "@/lib/data";
import { buildSeries, multiObservationGroups } from "@/lib/series";
import { PageHeader } from "@/components/PageHeader";
import { formatUtc, formatValueWithUnit } from "@/lib/format";

export const metadata: Metadata = { title: "Revisions" };

export default function RevisionsPage() {
  const journal = getJournal();
  const series = buildSeries(journal);
  const multi = multiObservationGroups(series);
  const superseded = journal.filter((e) => e.row.assertionVersion?.supersedes);

  return (
    <div>
      <PageHeader
        title="First prints and revisions"
        lede={
          <>
            What was known when. The journal records the first print of each
            release; when a source revises a number, the revision arrives as a
            new observation and the first print stays on the record. Nothing
            is overwritten.
          </>
        }
      />

      <section aria-labelledby="corrections-heading">
        <h2 id="corrections-heading" className="text-xl">
          Corrections
        </h2>
        {superseded.length === 0 ? (
          <p className="mt-2 max-w-3xl text-sm text-text-secondary">
            No correction has been recorded. A correction appends a new row
            whose <code>assertionVersion.supersedes</code> names the replaced
            version; the superseded row remains in the journal. When one
            exists, the full chain will render here.
          </p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {superseded.map((e) => (
              <li key={e.row.source_record_id}>
                <Link
                  href={`/journal/${encodeURIComponent(e.row.source_record_id)}`}
                  className="record-id"
                >
                  {e.row.source_record_id}
                </Link>{" "}
                supersedes <code>{e.row.assertionVersion?.supersedes}</code>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="multi-heading" className="mt-10">
        <h2 id="multi-heading" className="text-xl">
          Multiple observations of one release
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-text-secondary">
          {multi.length} series–period groups carry more than one observation —
          separate capture paths recorded the same release, sometimes with
          different units or framing. The journal shows each capture as
          recorded; it does not pick a winner.
        </p>
        <div className="mt-4 space-y-6">
          {multi.map(({ series: s, group }) => (
            <div
              key={`${s.id}-${group.period}`}
              className="border border-border-soft bg-paper p-4"
            >
              <h3 className="font-mono text-sm">
                {s.concept} · {group.period} · {s.geographyName}
              </h3>
              <div className="mt-2 overflow-x-auto">
                <table className="register">
                  <thead>
                    <tr>
                      <th scope="col">Line</th>
                      <th scope="col">Fact</th>
                      <th scope="col">Value as recorded</th>
                      <th scope="col">First print</th>
                      <th scope="col">Accepted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.entries.map((e) => (
                      <tr key={e.row.source_record_id}>
                        <td className="lineno">{e.line}</td>
                        <td>
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
                        <td className="whitespace-nowrap">{e.row.observed_at}</td>
                        <td className="whitespace-nowrap text-text-tertiary">
                          {e.availability
                            ? formatUtc(e.availability.acceptedAtUtc).slice(0, 10)
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="series-heading" className="mt-10">
        <h2 id="series-heading" className="text-xl">
          All series
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-text-secondary">
          {series.length} series across {journal.length} journal rows. Each
          series lists its periods in order, first print first.
        </p>
        <div className="mt-4 space-y-4">
          {series.map((s) => (
            <details
              key={s.id}
              id={s.id}
              className="border border-border-soft bg-paper"
            >
              <summary className="cursor-pointer px-4 py-3">
                <span className="font-mono text-sm">{s.concept}</span>{" "}
                <span className="text-sm text-text-tertiary">
                  · {s.geographyName} · {s.entryCount} observation
                  {s.entryCount === 1 ? "" : "s"}
                </span>
              </summary>
              <div className="border-t border-border-soft px-4 py-3">
                <ul className="space-y-1 text-sm">
                  {s.periods.map((g) =>
                    g.entries.map((e) => (
                      <li key={e.row.source_record_id} className="flex flex-wrap gap-x-3">
                        <span className="font-mono text-text-tertiary">
                          {g.period}
                        </span>
                        <Link
                          href={`/journal/${encodeURIComponent(e.row.source_record_id)}`}
                          className="record-id"
                        >
                          {e.row.source_record_id}
                        </Link>
                        <span className="font-mono">
                          {formatValueWithUnit(e.row.value, e.row.measure.unit)}
                        </span>
                      </li>
                    )),
                  )}
                </ul>
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
