import type { Metadata } from "next";
import Link from "next/link";
import { getBuildReport, getJournal, getPins, getRegistry } from "@/lib/data";
import { PageHeader } from "@/components/PageHeader";
import { Stamp } from "@/components/Stamp";
import { truncateHash } from "@/lib/format";

export const metadata: Metadata = { title: "Sources" };

export default function SourcesPage() {
  const registry = getRegistry();
  const report = getBuildReport();
  const journal = getJournal();
  const pins = getPins();

  const built = registry.packages.filter((p) => p.built);
  const skipped = registry.packages.filter((p) => !p.built);
  const authorities = new Map<string, typeof built>();
  for (const p of built) {
    const a = p.authority ?? "other";
    const list = authorities.get(a);
    if (list) list.push(p);
    else authorities.set(a, [p]);
  }

  const journalFeeds = new Map<string, { count: number; lastObserved: string }>();
  for (const e of journal) {
    const name = e.row.source.source_name;
    const cur = journalFeeds.get(name);
    if (!cur) {
      journalFeeds.set(name, { count: 1, lastObserved: e.row.observed_at });
    } else {
      cur.count += 1;
      if (e.row.observed_at > cur.lastObserved) cur.lastObserved = e.row.observed_at;
    }
  }

  return (
    <div>
      <PageHeader
        title="Sources"
        lede={
          <>
            What feeds the Ledger. Store facts come from archived source
            packages — exact publisher files, checksummed at retrieval. Journal
            rows come from first-print capture against official release
            calendars.
          </>
        }
      />

      <section aria-labelledby="packages-heading">
        <h2 id="packages-heading" className="text-xl">
          Source packages
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-text-secondary">
          {built.length} packages built into the {registry.year} bundle at{" "}
          {pins.bundle.repo}@{truncateHash(pins.bundle.commit, 8)};{" "}
          {skipped.length} more are defined but have no artifact for{" "}
          {registry.year}. Every package pins its source bytes by SHA-256 and
          records when they were fetched.
        </p>
        {[...authorities.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([authority, packages]) => (
            <div key={authority} className="mt-6">
              <h3 className="font-mono text-sm uppercase tracking-[0.08em] text-text-secondary">
                {authority}
              </h3>
              <div className="mt-2 overflow-x-auto">
                <table className="register">
                  <thead>
                    <tr>
                      <th scope="col">Package</th>
                      <th scope="col">Source table</th>
                      <th scope="col">Facts</th>
                      <th scope="col">Fetched</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packages.map((p) => {
                      const lastFetch = p.manifest?.files
                        ?.map((f) => f.fetched_at)
                        .filter(Boolean)
                        .sort()
                        .pop();
                      return (
                        <tr key={p.package_id}>
                          <td>
                            <Link
                              href={`/sources/${encodeURIComponent(p.package_id)}`}
                              className="record-id"
                            >
                              {p.package_id}
                            </Link>
                          </td>
                          <td className="max-w-sm">
                            {p.source_table ?? p.label ?? "—"}
                          </td>
                          <td className="whitespace-nowrap font-mono text-[0.8125rem]">
                            {(p.facts ?? 0).toLocaleString()}
                          </td>
                          <td className="whitespace-nowrap text-text-tertiary">
                            {lastFetch ? String(lastFetch).slice(0, 10) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
      </section>

      {skipped.length ? (
        <section aria-labelledby="skipped-heading" className="mt-10">
          <h2 id="skipped-heading" className="text-xl">
            Not in this bundle
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-text-secondary">
            Defined packages without a {registry.year} artifact — typically
            single-vintage packages for other years. Listed so the bundle’s
            boundary is visible.
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {skipped.map((p) => (
              <li key={p.package_id} className="flex flex-wrap items-baseline gap-2">
                <code>{p.package_id}</code>
                <span className="text-xs text-text-tertiary">{p.skip_reason}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="feeds-heading" className="mt-10">
        <h2 id="feeds-heading" className="text-xl">
          Journal feeds
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-text-secondary">
          Publishers whose releases the journal has captured at first print.
          Capture cadence follows each publisher’s release calendar.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="register">
            <thead>
              <tr>
                <th scope="col">Publisher</th>
                <th scope="col">Rows</th>
                <th scope="col">Latest first print</th>
              </tr>
            </thead>
            <tbody>
              {[...journalFeeds.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([name, info]) => (
                  <tr key={name}>
                    <td>
                      <Link href={`/journal?source=${encodeURIComponent(name)}`}>
                        <code>{name}</code>
                      </Link>
                    </td>
                    <td className="font-mono text-[0.8125rem]">{info.count}</td>
                    <td className="whitespace-nowrap">{info.lastObserved}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {report.warnings.length ? (
        <section aria-labelledby="warnings-heading" className="mt-10">
          <h2 id="warnings-heading" className="text-xl">
            Build warnings
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-text-secondary">
            The bundle build reported these; they are part of the record.
          </p>
          <ul className="mt-3 space-y-2">
            {report.warnings.map((w, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-2 text-sm">
                <Stamp tone="flag">{w.code}</Stamp>
                <span className="text-text-secondary">{w.message}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
