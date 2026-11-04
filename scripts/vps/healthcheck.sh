#!/usr/bin/env bash
# Health check for the VPS NutriTrack stack. Runs on the VPS (SSH) or locally against a tunnel.
#
#   bash scripts/vps/healthcheck.sh              # on the VPS / through a tunnel
#   APP_PORT=3200 HEALTH_URL=... bash ...        # override target
set -euo pipefail

URL="${HEALTH_URL:-http://127.0.0.1:${APP_PORT:-3200}/dang-nhap}"
ATTEMPTS="${ATTEMPTS:-30}"
SLEEP="${SLEEP:-2}"

for i in $(seq 1 "$ATTEMPTS"); do
  code="$(curl -fsS -o /dev/null -w '%{http_code}' --max-time 5 "$URL" 2>/dev/null || true)"
  if [[ "$code" == "200" ]]; then
    echo "healthcheck: OK ($URL → 200) after ${i} attempt(s)"
    exit 0
  fi
  sleep "$SLEEP"
done

echo "healthcheck: FAILED ($URL did not return 200 after ${ATTEMPTS} attempts)" >&2
exit 1
