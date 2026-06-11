#!/usr/bin/env bash
# deploy.sh — the ONLY blessed way to ship the institute landing.
#
# Deploys to PRODUCTION (a new deployment ID purges Vercel's edge cache) and then
# verifies the bare production URLs. Because the canaries run automatically, a
# stale or broken serve fails the deploy loudly instead of being declared "done".
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "==> vercel --prod (thesis-institute)…"
vercel --prod --yes

echo "==> verifying bare production URLs (retrying for propagation)…"
"$DIR/verify.sh" 6 apex
