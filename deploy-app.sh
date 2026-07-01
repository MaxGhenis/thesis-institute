#!/usr/bin/env bash
# deploy-app.sh — deploy the forecasting app (app.thesisinstitute.org) to
# PRODUCTION, verify, and AUTO-ROLL-BACK if the new build fails the canaries.
# The app is the `brier-almanac` Vercel project, built from ~/farness/site.
# Kept here (not in the farness repo) so all thesisinstitute ops are versioned
# in one place and every deploy path self-verifies.
#
# Run this in the FOREGROUND. Backgrounding an app deploy is what let a stale
# build complete late and grab the production alias (2026-06 incident).
set -euo pipefail

# Break-glass only (2026-07-02): production deploys are git-integrated — push
# main and Vercel builds it. CLI deploys bypass tests/review and can capture
# the alias from any checkout (both 2026-06 incidents). Use only when GitHub
# or the git integration is down.
if [ "${THESIS_BREAK_GLASS:-}" != "1" ]; then
  echo "Deploys are git-push-to-main now (see README.md). This script is" >&2
  echo "break-glass only; set THESIS_BREAK_GLASS=1 if you really mean it." >&2
  exit 1
fi

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${FARNESS_SITE:-$HOME/farness/site}"
DOMAIN="app.thesisinstitute.org"
[ -d "$APP_DIR/.vercel" ] || { echo "Not linked to Vercel: $APP_DIR (set FARNESS_SITE?)"; exit 1; }

# Refuse to ship uncommitted site changes. Deploying WIP/stale trees is how the
# 2026-06-08 alias capture happened. Override deliberately with ALLOW_DIRTY=1.
if [ -z "${ALLOW_DIRTY:-}" ] && [ -n "$(git -C "$APP_DIR" status --porcelain -- .)" ]; then
  echo "✗ uncommitted changes under $APP_DIR — commit them first, or rerun with ALLOW_DIRTY=1."
  git -C "$APP_DIR" status --porcelain -- . | head -10
  exit 1
fi
echo "==> deploying site at: $(git -C "$APP_DIR" log -1 --format='%h %s' 2>/dev/null || echo 'not a git checkout')"

TOK=$(python3 -c "import json,os;print(json.load(open(os.path.expanduser('~/Library/Application Support/com.vercel.cli/auth.json')))['token'])")
TEAM=team_xsyTmFLMLGbHH7Qxu70R5G4r

# the deployment the production alias currently points to — our rollback target
current_target() {
  curl -s "https://api.vercel.com/v4/aliases?teamId=$TEAM&limit=30" -H "Authorization: Bearer $TOK" \
    | python3 -c 'import json,sys
for a in json.load(sys.stdin).get("aliases",[]):
    if a.get("alias")=="'"$DOMAIN"'": print(a.get("deployment",{}).get("url","")); break'
}

PREV="$(current_target || true)"
echo "==> current live deployment: ${PREV:-unknown}"

echo "==> vercel --prod (app: $APP_DIR)…"
( cd "$APP_DIR" && vercel --prod --yes )

echo "==> verifying bare production URLs (retrying for propagation)…"
if "$DIR/verify.sh" 6 app; then
  echo "✓ app deploy verified"
else
  echo "✗ CANARY FAILED after deploy."
  if [ -n "$PREV" ]; then
    echo "   rolling $DOMAIN back to last-good deployment: $PREV"
    vercel alias set "$PREV" "$DOMAIN" --scope policy-engine
    echo "   re-verifying after rollback…"
    "$DIR/verify.sh" 4 app || true
  else
    echo "   no previous deployment captured — fix manually (vercel alias set <good-deploy> $DOMAIN)."
  fi
  exit 1
fi
