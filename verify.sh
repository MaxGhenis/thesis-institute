#!/usr/bin/env bash
# verify.sh — canary checks for thesisinstitute.org and its app subdomain.
#
# Checks the BARE production URLs a real browser actually requests — NO
# cache-busting query strings. Cache-busted (`?cb=`) requests hit a fresh edge
# cache key and can show correct content while the bare URL still serves a stale
# copy. That masking is exactly what hid the 2026-06 stale-old-app incident, so
# this script deliberately hits the same doors a browser does.
#
# Usage:  ./verify.sh [attempts]    attempts defaults to 1; deploy.sh passes a
#                                   higher number to ride out alias propagation.
# Exit:   0 = every canary passed, 1 = at least one failed.

set -uo pipefail

ATTEMPTS="${1:-1}"
GREEN=$'\033[32m'; RED=$'\033[31m'; DIM=$'\033[2m'; NC=$'\033[0m'

status() { curl -sS -o /dev/null -w '%{http_code}' "$1"; }
status_follow() { curl -sSL -o /dev/null -w '%{http_code}' "$1"; }
location() { curl -sSI "$1" | awk 'tolower($1)=="location:"{print $2}' | tr -d '\r'; }

run_checks() {
  FAIL=0
  pass() { printf "  ${GREEN}PASS${NC}  %s\n" "$1"; }
  fail() { printf "  ${RED}FAIL${NC}  %s\n" "$1"; FAIL=1; }
  local code loc html

  # --- apex: must serve the fresh static institute landing ---
  code=$(status https://thesisinstitute.org/)
  html=$(curl -sS https://thesisinstitute.org/)
  [ "$code" = 200 ] && pass "apex /                      200" || fail "apex /                      $code (want 200)"
  grep -q "A sampling of forecasts" <<<"$html" \
    && pass "apex /  has institute content" \
    || fail "apex /  MISSING 'A sampling of forecasts' — stale old-app build?"
  grep -q 'href="/paper"' <<<"$html" \
    && fail "apex /  still links /paper — OLD APP nav is being served" \
    || pass "apex /  no /paper link (old-app marker absent)"

  # --- apex /thesis -> 308 -> app/about ---
  code=$(status https://thesisinstitute.org/thesis)
  loc=$(location https://thesisinstitute.org/thesis)
  { [ "$code" = 308 ] && [[ "$loc" == *app.thesisinstitute.org/about* ]]; } \
    && pass "apex /thesis                308 -> app/about" \
    || fail "apex /thesis                $code -> $loc (want 308 -> app.thesisinstitute.org/about)"

  # --- apex /paper -> 404 (old Research route must be gone) ---
  code=$(status https://thesisinstitute.org/paper)
  [ "$code" = 404 ] && pass "apex /paper                 404" \
                    || fail "apex /paper                 $code (want 404; old app served 200)"

  # --- www -> redirect to apex ---
  code=$(status https://www.thesisinstitute.org/)
  loc=$(location https://www.thesisinstitute.org/)
  { [[ "$code" =~ ^30[78]$ ]] && [[ "$loc" == *thesisinstitute.org/* ]]; } \
    && pass "www                         $code -> apex" \
    || fail "www                         $code -> $loc (want 307/308 -> apex)"

  # --- app /forecasts: the institute's 'Forecasts' link target ---
  code=$(status_follow https://app.thesisinstitute.org/forecasts)
  html=$(curl -sSL https://app.thesisinstitute.org/forecasts)
  [ "$code" = 200 ] && pass "app /forecasts              200" \
                    || fail "app /forecasts              $code (want 200; stale build 308'd to apex -> 404)"
  grep -q '>About<' <<<"$html" \
    && pass "app /forecasts has new nav (About)" \
    || fail "app /forecasts MISSING 'About' nav — stale app build?"
  grep -q 'href="/paper"' <<<"$html" \
    && fail "app /forecasts still links /paper — OLD APP nav" \
    || pass "app /forecasts no /paper link"

  # --- app /about: the institute's 'About' link target ---
  code=$(status_follow https://app.thesisinstitute.org/about)
  [ "$code" = 200 ] && pass "app /about                  200" \
                    || fail "app /about                  $code (want 200)"

  # --- app root must SERVE the app, not redirect to the apex ---
  code=$(status https://app.thesisinstitute.org/)
  [ "$code" = 200 ] && pass "app /                       200 (serves app, not redirect)" \
                    || fail "app /                       $code (want 200; stale build redirected to apex)"

  return $FAIL
}

echo "Thesis Institute canary checks — $(date '+%Y-%m-%d %H:%M:%S')"
for ((i = 1; i <= ATTEMPTS; i++)); do
  if run_checks; then
    echo "${GREEN}All canaries passed.${NC}"
    exit 0
  fi
  if [ "$i" -lt "$ATTEMPTS" ]; then
    echo "${DIM}  retry $i/$ATTEMPTS — waiting 6s for propagation…${NC}"
    sleep 6
  fi
done
echo "${RED}CANARY FAILURE — a surface is serving stale/incorrect content.${NC}"
echo "Fix: redeploy the affected project to PRODUCTION (a new deployment ID purges the"
echo "edge cache), then re-run. See README.md → 'If a canary fails'. Always check bare URLs."
exit 1
