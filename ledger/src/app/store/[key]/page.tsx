import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { STORE_KEY_PREFIX, getPins, getRegistry, getStoreFact } from "@/lib/data";
import { citeStoreFact } from "@/lib/citation";
import { CitationSlip } from "@/components/CitationSlip";
import { PageHeader } from "@/components/PageHeader";
import { formatPeriod, formatValueWithUnit } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  return { title: `${STORE_KEY_PREFIX}:${key}` };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

export default async function StoreFactPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const hit = getStoreFact(decodeURIComponent(key));
  if (!hit) notFound();
  const { fact, packageId } = hit;
  const pins = getPins();
  const registry = getRegistry();
  const pkgMeta = registry.packages.find((p) => p.package_id === packageId);
  const citation = citeStoreFact(fact, packageId, pins);
  const om = fact.observed_measure ?? {};
  const source = (fact.source ?? {}) as Record<string, unknown>;

  const keyFields: [string, string | undefined][] = [
    ["Aggregate fact key", fact.aggregate_fact_key],
    ["Semantic fact key", fact.semantic_fact_key],
    ["Observed measure key", fact.observed_measure_key],
    ["Source release key", fact.source_release_key],
    ["Source series key", fact.source_series_key],
    ["Dimension set key", fact.dimension_set_key],
    ["Legacy fact key", fact.legacy_fact_key],
  ];

  return (
    <div className="max-w-4xl">
      <p className="font-mono text-xs text-text-tertiary">
        store fact · package {packageId}
      </p>
      <h1 className="mt-1 break-all font-mono text-xl sm:text-2xl">
        {fact.aggregate_fact_key}
      </h1>
      <p className="mt-3 max-w-3xl text-text-secondary">{fact.label}</p>

      <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="font-mono text-3xl">
          {formatValueWithUnit(fact.value, om.unit, om.value_scale)}
        </span>
        <span className="text-text-secondary">
          {formatPeriod(fact.period.type, fact.period.value)} ·{" "}
          {fact.geography.name ?? fact.geography.id} · {fact.assertion}
        </span>
      </div>

      <CitationSlip citation={citation} />

      <section aria-labelledby="measure-heading" className="mt-8">
        <h2 id="measure-heading" className="text-lg">
          Observed measure
        </h2>
        <dl className="field-table mt-3">
          {om.source_concept ? (
            <Field label="Source concept">
              <code>{om.source_concept}</code>
            </Field>
          ) : null}
          {om.source_measure_id ? (
            <Field label="Measure id">
              <code>{om.source_measure_id}</code>
            </Field>
          ) : null}
          <Field label="Unit">
            {om.unit ?? "—"}
            {om.value_scale && om.value_scale !== "unit" ? ` (${om.value_scale})` : ""}
          </Field>
          <Field label="Aggregation">{fact.aggregation.method}</Field>
          <Field label="Entity">
            {fact.entity.name} ({fact.entity.role})
          </Field>
          {fact.dimensions && Object.keys(fact.dimensions).length ? (
            <Field label="Dimensions">
              <code>{JSON.stringify(fact.dimensions)}</code>
            </Field>
          ) : null}
        </dl>
      </section>

      <section aria-labelledby="lineage-heading" className="mt-8">
        <h2 id="lineage-heading" className="text-lg">
          Lineage
        </h2>
        <dl className="field-table mt-3">
          {fact.lineage?.source_record_id ? (
            <Field label="Source record">
              <code className="break-all">{fact.lineage.source_record_id}</code>
            </Field>
          ) : null}
          {typeof source.source_table === "string" ? (
            <Field label="Source table">{source.source_table}</Field>
          ) : null}
          {typeof source.source_file === "string" ? (
            <Field label="Source file">
              <code>{source.source_file}</code>
            </Field>
          ) : null}
          {typeof source.url === "string" ? (
            <Field label="Source URL">
              <a href={source.url} rel="noreferrer" className="break-all">
                {source.url}
              </a>
            </Field>
          ) : null}
          {typeof source.vintage === "string" ? (
            <Field label="Vintage">
              <code>{source.vintage}</code>
            </Field>
          ) : null}
          {typeof source.source_sha256 === "string" ? (
            <Field label="Source bytes SHA-256">
              <code className="break-all">{source.source_sha256}</code>
            </Field>
          ) : null}
          {typeof source.raw_r2_uri === "string" ? (
            <Field label="Archived at">
              <code className="break-all">{source.raw_r2_uri}</code>
            </Field>
          ) : null}
          {typeof source.extracted_at === "string" ? (
            <Field label="Extracted">{source.extracted_at}</Field>
          ) : null}
          {typeof source.extraction_method === "string" ? (
            <Field label="Extraction method">{source.extraction_method}</Field>
          ) : null}
        </dl>
        <p className="mt-3 text-sm">
          <Link href={`/sources/${encodeURIComponent(packageId)}`}>
            Package provenance: {pkgMeta?.label ?? packageId} →
          </Link>
        </p>
      </section>

      <section aria-labelledby="keys-heading" className="mt-8">
        <h2 id="keys-heading" className="text-lg">
          Identity keys
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-text-secondary">
          Layered v2 identities: the aggregate key names this observation from
          this source release; the semantic key names the source-agnostic
          statistic it measures. Keys are deterministic hashes over canonical
          content — the same content always gets the same address.
        </p>
        <dl className="field-table mt-3">
          {keyFields.map(([label, value]) =>
            value ? (
              <Field key={label} label={label}>
                <code className="break-all">{value}</code>
              </Field>
            ) : null,
          )}
        </dl>
      </section>

      <details className="mt-8">
        <summary className="cursor-pointer text-sm text-text-secondary">
          Raw fact (JSON)
        </summary>
        <pre className="mt-2 overflow-x-auto border border-border-soft bg-paper p-4 text-xs leading-5">
          {JSON.stringify(fact, null, 1)}
        </pre>
      </details>

      <p className="mt-8 font-mono text-xs text-text-tertiary">
        Read this fact as JSON:{" "}
        <Link href={`/api/store/${encodeURIComponent(key)}`}>/api/store/{key}</Link>
      </p>
    </div>
  );
}
