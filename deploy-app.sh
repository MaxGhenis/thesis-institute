#!/usr/bin/env bash
# deploy-app.sh — deploy the forecasting app (app.thesisinstitute.org) to
# PRODUCTION and verify. The app is the `brier-almanac` Vercel project, built
# from ~/farness/site. Kept here (not in the farness repo) so all thesisinstitute
# ops are versioned in one place and every deploy path self-verifies.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${FARNESS_SITE:-$HOME/farness/site}"
[ -d "$APP_DIR/.vercel" ] || { echo "Not linked to Vercel: $APP_DIR (set FARNESS_SITE?)"; exit 1; }

echo "==> vercel --prod (app: $APP_DIR)…"
( cd "$APP_DIR" && vercel --prod --yes )

echo "==> verifying bare production URLs (retrying for propagation)…"
"$DIR/verify.sh" 6
