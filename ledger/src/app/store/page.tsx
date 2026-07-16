import type { Metadata } from "next";
import Link from "next/link";
import { getPins, getRegistry, getStoreIndex } from "@/lib/data";
import { PageHeader } from "@/components/PageHeader";
import { formatPeriod, formatValueWithUnit, truncateHash } from "@/lib/format";

export const metadata: Metadata = { title: "Store" };

const PAGE_SIZE = 100;

export default async function StorePage({
  searchParams,
}: {
  searchParams: Promise<{ pkg?: string; page?: string }>;
}) {
  const { pkg, page } = await searchParams;
  const index = getStoreIndex();
  const registry = getRegistry();
  const pins = getPins();

  if (!pkg) {
    const byPackage = new Map<string, number>();
    for (const f of index) {
      byPackage.set(f.pkg, (byPackage.get(f.pkg) ?? 0) + 1);
    }
    const packages = registry.packages.filter((p) => p.built);
    return (
      <div>
        <PageHeader
          title="Store"
          lede={
            <>
              {pins.bundle.factCount.toLocaleString()} source-backed aggregate
              facts parsed from {packages.length} source packages, built from{" "}
              {pins.bundle.repo}@{truncateHash(pins.bundle.commit, 8)} with{" "}
              <code>{pins.bundle.command}</code>. Each fact re-expresses one
              published value with lineage to the archived source bytes —
              nothing is reconciled, imputed, or modeled.
            </>
          }
        />
        <div className="overflow-x-auto">
          <table className="register">
            <thead>
              <tr>
                <th scope="col">Package</th>
                <th scope="col">Authority</th>
                <th scope="col">Source table</th>
                <th scope="col">Facts</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((p) => (
                <tr key={p.package_id}>
                  <td>
                    <Link
                      href={`/store?pkg=${encodeURIComponent(p.package_id)}`}
                      className="record-id"
                    >
                      {p.package_id}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap">{p.authority ?? "—"}</td>
                  <td className="max-w-sm">{p.source_table ?? p.label ?? "—"}</td>
                  <td className="whitespace-nowrap font-mono text-[0.8125rem]">
                    {(byPackage.get(p.package_id) ?? 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const facts = index.filter((f) => f.pkg === pkg);
  const pageNum = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const pages = Math.max(1, Math.ceil(facts.length / PAGE_SIZE));
  const slice = facts.slice((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE);
  const meta = registry.packages.find((p) => p.package_id === pkg);

  return (
    <div>
      <PageHeader
        title={pkg}
        lede={
          <>
            {meta?.label ?? meta?.source_table ?? ""} —{" "}
            {facts.length.toLocaleString()} facts.{" "}
            <Link href={`/sources/${encodeURIComponent(pkg)}`}>
              Package provenance →
            </Link>
          </>
        }
      />
      <p className="mb-4 text-sm">
        <Link href="/store">← All packages</Link>
      </p>
      <div className="overflow-x-auto">
        <table className="register">
          <thead>
            <tr>
              <th scope="col">Fact</th>
              <th scope="col">Value</th>
              <th scope="col">Period</th>
              <th scope="col">Geography</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((f) => (
              <tr key={f.k}>
                <td className="max-w-xl">
                  <Link href={`/store/${f.k}`} className="record-id">
                    {truncateHash(f.k, 24)}
                  </Link>
                  <div className="mt-0.5 max-w-xl text-xs text-text-tertiary">
                    {f.label}
                  </div>
                </td>
                <td className="whitespace-nowrap font-mono text-[0.8125rem]">
                  {formatValueWithUnit(f.v, f.u, f.s)}
                </td>
                <td className="whitespace-nowrap">{formatPeriod(f.pt, f.pv)}</td>
                <td className="whitespace-nowrap">{f.gn ?? f.g ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 ? (
        <nav aria-label="Pagination" className="mt-4 flex items-center gap-4 text-sm">
          {pageNum > 1 ? (
            <Link href={`/store?pkg=${encodeURIComponent(pkg)}&page=${pageNum - 1}`}>
              ← Previous
            </Link>
          ) : (
            <span className="text-text-disabled">← Previous</span>
          )}
          <span className="text-text-tertiary">
            Page {pageNum} of {pages}
          </span>
          {pageNum < pages ? (
            <Link href={`/store?pkg=${encodeURIComponent(pkg)}&page=${pageNum + 1}`}>
              Next →
            </Link>
          ) : (
            <span className="text-text-disabled">Next →</span>
          )}
        </nav>
      ) : null}
    </div>
  );
}
