#!/usr/bin/env bash
# monitor.sh — run the canaries and alert on failure. Invoked by launchd
# (org.thesisinstitute.canary) on a daily schedule so a regression can never
# sit undetected the way the 2026-06 stale-cache incident did.
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG="$DIR/.canary.log"
TS="$(date '+%Y-%m-%d %H:%M:%S')"

if out="$("$DIR/verify.sh" 3 2>&1)"; then
  echo "[$TS] OK" >>"$LOG"
  exit 0
fi

{
  echo "[$TS] FAIL"
  echo "$out"
  echo "----"
} >>"$LOG"

# macOS notification (reliable on Max's Mac; no credentials needed).
osascript -e 'display notification "thesisinstitute.org is serving stale/incorrect content — run ~/thesis-institute/deploy.sh" with title "Thesis canary FAILED" sound name "Basso"' 2>/dev/null || true

exit 1
