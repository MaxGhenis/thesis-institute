# The Thesis Institute — landing site

Static landing for **thesisinstitute.org** (the org). The forecasting app is a
separate Next.js project served at **app.thesisinstitute.org** (Vercel project
`brier-almanac`, built from `~/farness/site`).

## Domains

| URL | Serves | Project |
|-----|--------|---------|
| `thesisinstitute.org` | this static landing | `thesis-institute` |
| `www.thesisinstitute.org` | → 307 → apex | `thesis-institute` |
| `thesisinstitute.org/thesis` | → 308 → app `/about` | `thesis-institute` (`vercel.json`) |
| `app.thesisinstitute.org` | the forecasting app | `brier-almanac` (`~/farness/site`) |
| `api.thesisinstitute.org` | API | `thesis-api` |
| `farness.ai`, `brieralmanac.org` | legacy → app | redirects |

Vercel team: `policy-engine`. Both web projects are **CLI-deployed** (not
git-integrated), so deploys are manual — which is precisely why the deploy
script below self-verifies.

## Deploy — always use these

```bash
./deploy.sh         # institute landing → vercel --prod + bare-URL canary verify
./deploy-app.sh     # app (app.thesisinstitute.org, ~/farness/site) → same
```

Never run a bare `vercel --prod` and call it done. Both scripts run `verify.sh`
against the **bare** production URLs afterward, so a stale or incorrect serve
fails the deploy loudly instead of slipping through.

## Verify / monitor

```bash
./verify.sh         # one pass; exit 0 = healthy, 1 = a surface is wrong
```

A launchd agent (`org.thesisinstitute.canary`) runs `monitor.sh` daily and
raises a macOS notification (and logs to `.canary.log`) if any canary fails.

## The 2026-06 incident (why all this exists)

`thesisinstitute.org` served a **stale old-app build** (nav `Thesis`/`Research`
linking to `/paper`) for hours. Three independent causes:

1. **Stale edge cache.** The old Next.js app had cached HTML at Vercel's edge
   for the apex with a long TTL; those entries survived the apex being switched
   to this static project. A **fresh production deploy** (new deployment ID)
   purges them — a redeploy of the *same* deployment does not.
2. **Stale deployment pinning.** `app.thesisinstitute.org` was pinned to an old
   app deployment whose `next.config` redirected the app subdomain → apex,
   404-ing the institute's links.
3. **Verification masked the bug.** Checks used `?cb=` cache-busters, which hit a
   *fresh* edge cache key and returned correct content — while the **bare** URL a
   browser requests kept serving the stale copy.

### If a canary fails

Redeploy the affected project to **production** (a new deployment ID purges the
edge cache):

- institute → `./deploy.sh`
- app → `./deploy-app.sh`

Both re-verify automatically. If checking by hand, **always hit bare URLs — never
`?cb=`** (a cache-buster hits a fresh edge key and masks the stale copy).
