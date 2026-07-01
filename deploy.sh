#!/usr/bin/env bash
# deploy.sh — the ONLY blessed way to ship the institute landing.
#
# Deploys to PRODUCTION (a new deployment ID purges Vercel's edge cache) and then
# verifies the bare production URLs. Because the canaries run automatically, a
# stale or broken serve fails the deploy loudly instead of being declared "done".
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
cd "$DIR"

echo "==> vercel --prod (thesis-institute)…"
vercel --prod --yes

echo "==> verifying bare production URLs (retrying for propagation)…"
"$DIR/verify.sh" 6 apex
