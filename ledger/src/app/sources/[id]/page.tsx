import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRegistry } from "@/lib/data";
import { formatBytes } from "@/lib/format";

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

export default async function SourcePackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const packageId = decodeURIComponent(id);
  const registry = getRegistry();
  const pkg = registry.packages.find((p) => p.package_id === packageId);
  if (!pkg) notFound();

  return (
    <div className="max-w-4xl">
      <p className="font-mono text-xs text-text-tertiary">source package</p>
      <h1 className="mt-1 break-all font-mono text-xl sm:text-2xl">
        {pkg.package_id}
      </h1>
      {pkg.label ? (
        <p className="mt-3 max-w-3xl text-text-secondary">{pkg.label}</p>
      ) : null}

      <dl className="field-table mt-6">
        {pkg.authority ? <Field label="Authority">{pkg.authority}</Field> : null}
        {pkg.source_table ? (
          <Field label="Source table">{pkg.source_table}</Field>
        ) : null}
        {pkg.manifest?.source_page ? (
          <Field label="Publisher page">
            <a href={pkg.manifest.source_page} rel="noreferrer" className="break-all">
              {pkg.manifest.source_page}
            </a>
          </Field>
        ) : null}
        {pkg.extraction_method ? (
          <Field label="Extraction method">{pkg.extraction_method}</Field>
        ) : null}
        {pkg.extracted_at ? <Field label="Extracted">{pkg.extracted_at}</Field> : null}
        {pkg.spec_path ? (
          <Field label="Package spec">
            <code>{pkg.spec_path}</code>
          </Field>
        ) : null}
        <Field label="In current bundle">
          {pkg.built
            ? `Yes — ${(pkg.facts ?? 0).toLocaleString()} facts`
            : `No — ${pkg.skip_reason ?? "not built"}`}
        </Field>
      </dl>

      {pkg.manifest?.files?.length ? (
        <section aria-labelledby="files-heading" className="mt-8">
          <h2 id="files-heading" className="text-lg">
            Archived source files
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-text-secondary">
            The exact publisher bytes this package parses, as retrieved and
            checksummed. If the publisher later changes the file, the recorded
            hash still names what the Ledger read.
          </p>
          <div className="mt-3 space-y-4">
            {pkg.manifest.files.map((f, i) => (
              <div key={i} className="border border-border-soft bg-paper p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <code className="text-sm">{f.filename ?? "—"}</code>
                  <span className="font-mono text-xs text-text-tertiary">
                    vintage {String(f.year)}
                  </span>
                </div>
                <dl className="field-table mt-2 text-sm">
                  {f.source_url ? (
                    <Field label="Retrieved from">
                      <a href={f.source_url} rel="noreferrer" className="break-all">
                        {f.source_url}
                      </a>
                    </Field>
                  ) : null}
                  {f.fetched_at ? (
                    <Field label="Fetched">
                      <span className="font-mono">{String(f.fetched_at)}</span>
                    </Field>
                  ) : null}
                  {f.sha256 ? (
                    <Field label="SHA-256">
                      <code className="break-all">{f.sha256}</code>
                    </Field>
                  ) : null}
                  {f.size_bytes ? (
                    <Field label="Size">{formatBytes(f.size_bytes)}</Field>
                  ) : null}
                </dl>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {pkg.built ? (
        <p className="mt-8 text-sm">
          <Link href={`/store?pkg=${encodeURIComponent(pkg.package_id)}`}>
            Browse this package’s facts →
          </Link>
        </p>
      ) : null}
    </div>
  );
}
