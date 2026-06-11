#!/usr/bin/env bash
# deploy-api.sh — deploy the forecast API (api.thesisinstitute.org) to
# PRODUCTION, verify, and AUTO-ROLL-BACK if the new build fails the canaries.
# The API is the `thesis-api` Vercel project, built from ~/farness/forecast-api.
# Same discipline as deploy-app.sh: run in the FOREGROUND, never background it,
# never bare `vercel --prod` from an unreviewed checkout.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="${FARNESS_API:-$HOME/farness/forecast-api}"
DOMAIN="api.thesisinstitute.org"
[ -d "$API_DIR/.vercel" ] || { echo "Not linked to Vercel: $API_DIR (set FARNESS_API?)"; exit 1; }

# Refuse to ship uncommitted changes (ALLOW_DIRTY=1 to override deliberately).
if [ -z "${ALLOW_DIRTY:-}" ] && [ -n "$(git -C "$API_DIR" status --porcelain -- .)" ]; then
  echo "✗ uncommitted changes under $API_DIR — commit them first, or rerun with ALLOW_DIRTY=1."
  git -C "$API_DIR" status --porcelain -- . | head -10
  exit 1
fi
echo "==> deploying forecast-api at: $(git -C "$API_DIR" log -1 --format='%h %s' 2>/dev/null || echo 'not a git checkout')"

TOK=$(python3 -c "import json,os;print(json.load(open(os.path.expanduser('~/Library/Application Support/com.vercel.cli/auth.json')))['token'])")
TEAM=team_xsyTmFLMLGbHH7Qxu70R5G4r

current_target() {
  curl -s "https://api.vercel.com/v4/aliases?teamId=$TEAM&limit=60" -H "Authorization: Bearer $TOK" \
    | python3 -c 'import json,sys
for a in json.load(sys.stdin).get("aliases",[]):
    if a.get("alias")=="'"$DOMAIN"'": print(a.get("deployment",{}).get("url","")); break'
}

PREV="$(current_target || true)"
echo "==> current live deployment: ${PREV:-unknown}"

echo "==> vercel --prod (forecast-api: $API_DIR)…"
( cd "$API_DIR" && vercel --prod --yes )

echo "==> verifying production canaries (retrying for propagation)…"
if "$DIR/verify.sh" 6 api; then
  echo "✓ api deploy verified"
else
  echo "✗ CANARY FAILED after deploy."
  if [ -n "$PREV" ]; then
    echo "   rolling $DOMAIN back to last-good deployment: $PREV"
    vercel alias set "$PREV" "$DOMAIN" --scope policy-engine
    echo "   re-verifying after rollback…"
    "$DIR/verify.sh" 4 api || true
  else
    echo "   no previous deployment captured — fix manually (vercel alias set <good-deploy> $DOMAIN)."
  fi
  exit 1
fi
