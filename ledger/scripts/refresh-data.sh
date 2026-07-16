#!/usr/bin/env bash
# Refresh the app's vendored data snapshot and record new pins.
#
# The app serves a pinned snapshot; refreshing it is an explicit, reviewed
# change (a PR), not a runtime behavior. Requirements: gh, git, python3, and
# a PolicyEngine/ledger checkout with uv for the bundle build.
#
# Usage:
#   LEDGER_REPO=~/PolicyEngine/ledger scripts/refresh-data.sh
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LEDGER_REPO="${LEDGER_REPO:-$HOME/PolicyEngine/ledger}"
JOURNAL_BRANCH="codex/thesis-ledger-facts"
BUNDLE_YEAR="${BUNDLE_YEAR:-2023}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "== journal branch =="
git -C "$LEDGER_REPO" fetch origin "$JOURNAL_BRANCH" --quiet
JSHA=$(git -C "$LEDGER_REPO" rev-parse "origin/$JOURNAL_BRANCH")
echo "journal @ $JSHA"
mkdir -p "$APP_DIR/data/journal/releases/manifests" "$APP_DIR/data/journal/releases/anchors"
git -C "$LEDGER_REPO" show "${JSHA}:ledger/official_observations.jsonl" \
  > "$APP_DIR/data/journal/official_observations.jsonl"
git -C "$LEDGER_REPO" show "${JSHA}:ledger/immutable_prefix.json" \
  > "$APP_DIR/data/journal/immutable_prefix.json"
git -C "$LEDGER_REPO" show "${JSHA}:releases/README.md" \
  > "$APP_DIR/data/journal/releases/README.md"
find "$APP_DIR/data/journal/releases/manifests" "$APP_DIR/data/journal/releases/anchors" -type f -delete
git -C "$LEDGER_REPO" ls-tree -r --name-only "$JSHA" releases/manifests releases/anchors |
  while read -r f; do
    git -C "$LEDGER_REPO" show "${JSHA}:${f}" > "$APP_DIR/data/journal/$f"
  done

echo "== availability index (brier) =="
BSHA=$(gh api repos/MaxGhenis/brier/commits/main --jq '.sha')
echo "brier @ $BSHA"
curl -sf "https://raw.githubusercontent.com/MaxGhenis/brier/${BSHA}/records/ledger/availability.json" \
  > "$APP_DIR/data/journal/availability.json"

echo "== store bundle (this takes ~15 minutes) =="
MSHA=$(git -C "$LEDGER_REPO" rev-parse origin/main)
git -C "$LEDGER_REPO" worktree add "$WORK/ledger-main" "$MSHA" >/dev/null
(cd "$WORK/ledger-main" && uv sync --quiet &&
  uv run ledger build-bundle --year "$BUNDLE_YEAR" --out "$WORK/bundle" --replace)
(cd "$WORK/ledger-main" && uv run python "$APP_DIR/scripts/build_store_snapshot.py" \
  "$WORK/bundle" "$WORK/ledger-main" "$APP_DIR/data")
git -C "$LEDGER_REPO" worktree remove "$WORK/ledger-main" --force

echo "== pins =="
JSHA="$JSHA" BSHA="$BSHA" MSHA="$MSHA" BUNDLE_YEAR="$BUNDLE_YEAR" APP_DIR="$APP_DIR" \
  python3 "$APP_DIR/scripts/write_pins.py"

echo "== verify =="
(cd "$APP_DIR" && bun run test)
echo "Snapshot refreshed. Review the diff and open a PR."
