# Chronicle reference app

Read-only web app over the Thesis Institute's fact store — **Chronicle**
(working name; formerly Ledger) — targeting `chronicle.institute`, with
`ledger.thesisinstitute.org` redirecting there. Next.js App Router + bun +
Tailwind v4; Chronicle tokens inlined in
[src/app/globals.css](src/app/globals.css) (master set:
`constellation-design/tokens/chronicle.css`). The data layer keeps its
names: the upstream repo is still `PolicyEngine/ledger`, the CLI is still
`ledger` — repos are plumbing, not brand.

**Unlisted until the public launch decision**: every response carries
`X-Robots-Tag: noindex, nofollow`, `metadata.robots` is noindex, and
`robots.txt` disallows all. Remove the three together at launch
([next.config.ts](next.config.ts), [src/app/layout.tsx](src/app/layout.tsx),
[src/app/robots.ts](src/app/robots.ts)). The app is not linked from
thesisinstitute.org navigation.

## What it serves

Two fact populations, kept distinct because their guarantees differ:

- **Journal** (`/journal/{source_record_id}`) — the witnessed first-print
  observation feed from PolicyEngine/ledger's `codex/thesis-ledger-facts`
  branch, joined with brier's per-row acceptance index. The `/verify` page
  re-runs the release-chain checks in the browser over the exact committed
  bytes and labels precisely what it cannot check (RFC 3161 signature chains
  → offline verifier).
- **Store** (`/store/{aggregate-key-hash}`) — consumer facts built from
  PolicyEngine/ledger main with `ledger build-bundle`, one gzipped file per
  source package under `data/store/packages/`.

Every fact page carries a one-line citation (format `draft-2`, versioned in
[src/lib/citation.ts](src/lib/citation.ts)) with the fact ID, recorded value,
first-print date, source, and position (journal line + release, or store
snapshot pin). The same data is served as JSON under `/api/*` — see
`/about#api`.

## Data is a pinned snapshot

The app has no runtime upstream dependency. Everything under `data/` was
vendored at the commits recorded in [data/pins.json](data/pins.json), which
`/api/pins` and the page footer expose. Journal bytes are vendored exactly;
tests assert byte-for-byte agreement with the genesis release manifest.

To refresh (produces a reviewable diff; snapshot updates ship as PRs):

```bash
LEDGER_REPO=~/PolicyEngine/ledger scripts/refresh-data.sh
```

## Develop

```bash
bun install
bun run dev        # http://localhost:3000
bun run test       # vitest: chain verifier vs real bytes, citations, invariants
bun run typecheck
bun run build
```

## Honesty rails

- Witness status wording comes from [src/lib/status.ts](src/lib/status.ts)
  only; nothing is labeled "verified" that a verifier did not verify. Zero
  rows are witness-verified today: the genesis release witnesses the state,
  not any row's acceptance time.
- Custody enums (`append_derived`, `rewritten_in_place`) render verbatim,
  with the 13 pre-enforcement rewrites flagged, not hidden.
- Values render exactly as recorded — duplicate captures (including
  unit-inconsistent ones) are shown side by side on `/revisions`.
- No mock data anywhere; every number traces to the pinned snapshot.
