import type { Metadata } from "next";
import Link from "next/link";
import { getJournal, getPins } from "@/lib/data";
import { PageHeader } from "@/components/PageHeader";
import { SITE_ORIGIN } from "@/lib/citation";

export const metadata: Metadata = { title: "About" };

const API_ROUTES: { path: string; what: string }[] = [
  { path: "/api/pins", what: "The exact upstream commits and hashes this deployment serves." },
  { path: "/api/journal", what: "All journal rows with line numbers and acceptance records." },
  { path: "/api/journal/{source_record_id}", what: "One journal fact with its acceptance record." },
  { path: "/api/store/{key}", what: "One store fact by aggregate-key hash, full lineage included." },
  { path: "/api/sources", what: "The source-package registry with retrieval provenance." },
  { path: "/api/coverage", what: "The bundle coverage report, verbatim." },
  { path: "/api/search?q={query}", what: "Top matches across journal, store, and packages." },
  { path: "/api/releases", what: "Release manifests of the witnessed journal chain." },
  { path: "/api/raw/journal.jsonl", what: "The journal's exact bytes — hash them yourself." },
  { path: "/api/raw/releases/{stem}.{json|freetsa.tsr|digicert.tsr|producer.sig}", what: "Exact release-manifest, receipt, and signature bytes." },
  { path: "/api/raw/immutable_prefix.json", what: "The immutable-prefix manifest's exact bytes." },
  { path: "/api/raw/anchors/{file}", what: "Committed TSA root certificates and the producer public key." },
];

export default function AboutPage() {
  const pins = getPins();
  const journal = getJournal();

  return (
    <div className="max-w-3xl">
      <PageHeader title="About the Ledger" />

      <div className="prose-block text-[0.9375rem] leading-7">
        <p>
          The Ledger is the Thesis Institute’s fact store: a record of
          values that official sources actually published, kept the way a
          registrar keeps records. Each fact is a source-backed claim — who
          published it, where, for what period and geography, retrieved when,
          hashed as retrieved. The Ledger re-expresses published values into a
          queryable structure but never reconciles, imputes, forecasts, or
          otherwise changes what a source said. If two sources disagree, both
          claims are on the record.
        </p>
        <p>
          <strong>First-print discipline.</strong> Statistical agencies revise.
          Most databases quietly overwrite the old number with the new one,
          which destroys the information you need to evaluate any forecast,
          model, or decision made before the revision. The Ledger records the
          first print — the number as first published — and keeps it,
          permanently, even after revisions arrive as new observations. The
          journal is append-only: corrections append a superseding row and
          name what they supersede; nothing is edited in place.
        </p>
        <p>
          <strong>The journal is witnessed.</strong> Since{" "}
          {pins.retrievedAtUtc.slice(0, 10)}, every accepted journal state is
          committed by a chained release manifest, timestamped by two
          independent RFC 3161 authorities, and signed with a pinned producer
          key. You do not have to trust this site:{" "}
          <Link href="/verify">re-run the checks in your browser</Link>, or
          clone the journal and run the offline verifier. The{" "}
          <Link href="/verify">verify page</Link> also states exactly what the
          scheme does and does not prove — it is tamper evidence with producer
          identity, not multi-party governance.
        </p>
        <p>
          <strong>Two registers.</strong> The{" "}
          <Link href="/journal">journal</Link> ({journal.length} rows) is the
          witnessed first-print feed: macro releases captured on their release
          days. The <Link href="/store">store</Link> (
          {pins.bundle.factCount.toLocaleString()} facts) is the source-package
          register: administrative and statistical tables — IRS SOI, Census,
          BEA, CMS, SSA, HMRC, ONS, and more — parsed from archived source
          bytes into typed, addressable facts with full lineage. PolicyEngine
          and Populace calibrate against the store; Thesis forecasts resolve
          against the journal.
        </p>
        <p>
          <strong>Citability.</strong> Every fact has a stable URL and a
          standard one-line citation carrying the fact identifier, the recorded
          value, the first-print date, the source, and its position — journal
          line and witnessed release for journal facts, pinned snapshot commit
          for store facts. If a page moves or a format changes, the identifiers
          in an existing citation stay resolvable.
        </p>
      </div>

      <section id="api" aria-labelledby="api-heading" className="mt-12">
        <h2 id="api-heading" className="text-xl">
          Read access
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Everything this site renders is also served as JSON from the same
          pinned snapshot. Responses are stable for a given deployment; the
          snapshot’s provenance is in <code>/api/pins</code> and in the
          footer of every page.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="register">
            <thead>
              <tr>
                <th scope="col">Route</th>
                <th scope="col">Returns</th>
              </tr>
            </thead>
            <tbody>
              {API_ROUTES.map((r) => (
                <tr key={r.path}>
                  <td className="whitespace-nowrap pr-4">
                    <code className="text-[0.8125rem]">{r.path}</code>
                  </td>
                  <td className="text-sm">{r.what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-text-secondary">Example:</p>
        <pre className="mt-2 overflow-x-auto border border-border-soft bg-paper p-4 text-sm">
          {`curl ${SITE_ORIGIN}/api/journal/fns.snap.total_payment_error_rate.us.fy2025`}
        </pre>
        <p className="mt-4 text-sm text-text-secondary">
          The underlying data is in public repositories: the journal on the{" "}
          <a
            href={`https://github.com/${pins.journal.repo}/tree/${pins.journal.branch}`}
            rel="noreferrer"
          >
            {pins.journal.branch}
          </a>{" "}
          branch of {pins.journal.repo}, and the store built from{" "}
          <a href={`https://github.com/${pins.bundle.repo}`} rel="noreferrer">
            {pins.bundle.repo}
          </a>{" "}
          with <code>{pins.bundle.command}</code>.
        </p>
      </section>

      <section aria-labelledby="institute-heading" className="mt-12">
        <h2 id="institute-heading" className="text-xl">
          Thesis Institute
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          The Ledger is a Thesis Institute property, alongside{" "}
          <a href="https://app.thesisinstitute.org">open forecasts</a> that
          register predictions before outcomes and grade themselves against
          journal first prints. Estimation lives at Thesis; the deterministic
          rules engines it works with live at the Axiom Foundation.{" "}
          <a href="https://thesisinstitute.org">thesisinstitute.org</a>
        </p>
      </section>
    </div>
  );
}
