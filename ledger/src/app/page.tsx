import Link from "next/link";
import {
  getJournal,
  getPins,
  getRegistry,
  getReleases,
} from "@/lib/data";
import { journalHeadline } from "@/lib/status";
import { formatUtc, formatValueWithUnit, truncateHash } from "@/lib/format";
import { Stamp } from "@/components/Stamp";

export default function HomePage() {
  const journal = getJournal();
  const releases = getReleases().map((r) => r.manifest);
  const pins = getPins();
  const registry = getRegistry();
  const headline = journalHeadline(releases, journal.length);
  const latest = [...journal].slice(-8).reverse();

  return (
    <div>
      <div className="max-w-3xl">
        <h1 className="text-4xl sm:text-5xl">
          A record of what official sources printed, and when.
        </h1>
        <p className="mt-4 text-lg text-text-secondary">
          The Ledger stores source-backed facts — the numbers government
          statistical agencies actually published, kept at first print, with
          provenance, revision history, and a stable address for every fact.
          Values are recorded as published, never reconciled, imputed, or
          modeled.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-border-soft py-3 font-mono text-sm text-text-secondary">
        <span>{journal.length} journal rows</span>
        <span aria-hidden>·</span>
        <span>
          {pins.bundle.factCount.toLocaleString()} store facts in{" "}
          {pins.bundle.packageCount} source packages
        </span>
        <span aria-hidden>·</span>
        <span>
          {headline.releases} witnessed release
          {headline.releases === 1 ? "" : "s"}, {headline.witnessedAppends}{" "}
          witnessed append{headline.witnessedAppends === 1 ? "" : "s"}
        </span>
      </div>

      <section className="mt-10">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-xl">Latest journal entries</h2>
          <Link href="/journal" className="text-sm">
            Full journal →
          </Link>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="register">
            <thead>
              <tr>
                <th className="lineno" scope="col">
                  Line
                </th>
                <th scope="col">Fact</th>
                <th scope="col">Value</th>
                <th scope="col">First print</th>
                <th scope="col">Accepted</th>
              </tr>
            </thead>
            <tbody>
              {latest.map((e) => (
                <tr key={e.row.source_record_id}>
                  <td className="lineno">{e.line}</td>
                  <td>
                    <Link
                      href={`/journal/${encodeURIComponent(e.row.source_record_id)}`}
                      className="record-id"
                    >
                      {e.row.source_record_id}
                    </Link>
                    <div className="mt-0.5 max-w-xl text-xs text-text-tertiary">
                      {e.row.label}
                    </div>
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
      </section>

      <section className="mt-12 grid gap-8 sm:grid-cols-2">
        <div className="border border-border-soft bg-paper p-5">
          <h2 className="text-lg">The witnessed journal</h2>
          <p className="mt-2 text-sm text-text-secondary">
            First-print observations append through a gated flow. Each accepted
            state is committed by a chained release manifest, timestamped by
            two RFC 3161 authorities, and signed with the pinned producer key.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Stamp tone="witness">
              genesis {formatUtc(headline.genesisAtUtc).slice(0, 16)} UTC
            </Stamp>
            <Stamp tone="neutral">
              {headline.witnessedAppends} witnessed appends
            </Stamp>
          </div>
          <p className="mt-3 text-sm">
            <Link href="/verify">Verify the chain in your browser →</Link>
          </p>
        </div>
        <div className="border border-border-soft bg-paper p-5">
          <h2 className="text-lg">The source-package store</h2>
          <p className="mt-2 text-sm text-text-secondary">
            {pins.bundle.factCount.toLocaleString()} aggregate facts parsed
            from {pins.bundle.packageCount} archived source packages — IRS SOI,
            Census, BEA, BLS, CMS, SSA, HMRC, ONS and more — each fact carrying
            its lineage back to the exact archived source bytes.
          </p>
          <div className="mt-3 font-mono text-xs text-text-tertiary">
            snapshot {registry.year} bundle ·{" "}
            {truncateHash(pins.bundle.commit, 8)}
          </div>
          <p className="mt-3 text-sm">
            <Link href="/store">Browse the store →</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
