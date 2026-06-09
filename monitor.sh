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

# Email alert as well — the Jun 8 failure notified for two days unnoticed;
# email is durable. Uses gog (max@maxghenis.com gmail auth); failures log only.
GOG="$(command -v gog || true)"
[ -z "$GOG" ] && [ -x "$HOME/bin/gog" ] && GOG="$HOME/bin/gog"
if [ -n "$GOG" ]; then
  "$GOG" gmail send --account max@maxghenis.com --to max@maxghenis.com \
    --subject "Thesis canary FAILED $TS — run ~/thesis-institute/deploy.sh" \
    --body-html "<p>Canary failure on thesisinstitute.org surfaces. Runbook: <code>~/thesis-institute/README.md</code> → 'If a canary fails'.</p><pre>$(printf '%s' "$out" | sed 's/\x1b\[[0-9;]*m//g; s/&/\&amp;/g; s/</\&lt;/g')</pre>" \
    >>"$LOG" 2>&1 || echo "[$TS] email alert failed" >>"$LOG"
fi

exit 1
