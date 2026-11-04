#!/usr/bin/env bash
# Roll the VPS NutriTrack stack back to the previous release (QLD-51).
#
#   bash scripts/vps/rollback.sh              # back to releases/previous
#   bash scripts/vps/rollback.sh --to <tag>   # back to an explicit image tag
#   bash scripts/vps/rollback.sh --auto <tag> # used by deploy.sh after a failed health check:
#                                             # <tag> is the just-deployed SHA to return from
#
# The database is NOT reverted automatically: a Prisma migration is usually
# backward compatible, and rewinding data needs an explicit restore decision.
# If the bad release shipped a destructive migration, restore a dump from
# $REMOTE_DIR/backups first (see docs/ops/vps-deploy.md).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

VPS_SSH_HOST="${VPS_SSH_HOST:-oracle-vps}"
REMOTE_DIR="${REMOTE_DIR:-/opt/nutritrack}"
APP_PORT="${APP_PORT:-3200}"
WEB_PORT="${WEB_PORT:-8080}"

MODE="previous"
TARGET=""
case "${1:-}" in
  --to) MODE="explicit"; TARGET="${2:?usage: rollback.sh --to <tag>}" ;;
  --auto)
    MODE="auto"
    # deploy.sh passes the failed SHA; the target is whatever releases/previous holds.
    FAILED="${2:-}"
    ;;
  "") ;;
  *) echo "unknown argument: $1" >&2; exit 2 ;;
esac

if [[ "$MODE" == "explicit" ]]; then
  TARGET_SHA="$TARGET"
else
  TARGET_SHA="$(ssh "$VPS_SSH_HOST" "cat '$REMOTE_DIR/releases/previous' 2>/dev/null || true")"
fi

[[ -n "$TARGET_SHA" ]] || { echo "error: no previous release recorded on $VPS_SSH_HOST" >&2; exit 1; }
echo "rolling back to: $TARGET_SHA (mode: $MODE)"

ssh "$VPS_SSH_HOST" "docker image inspect 'nutritrack:$TARGET_SHA' --format '{{.Id}}'" >/dev/null 2>&1 \
  || { echo "error: image nutritrack:$TARGET_SHA is not present on the VPS" >&2; exit 1; }

CURRENT="$(ssh "$VPS_SSH_HOST" "head -1 '$REMOTE_DIR/releases/current' 2>/dev/null || true")"

ssh "$VPS_SSH_HOST" "cd '$REMOTE_DIR' && IMAGE_TAG='$TARGET_SHA' docker compose up -d --wait --wait-timeout 180 app web"

if ! ssh "$VPS_SSH_HOST" "cd '$REMOTE_DIR' && APP_PORT='$APP_PORT' ./healthcheck.sh" \
  || ! ssh "$VPS_SSH_HOST" "cd '$REMOTE_DIR' && HEALTH_URL='http://127.0.0.1:${WEB_PORT}/dang-nhap' ./healthcheck.sh"; then
  echo "error: rollback target $TARGET_SHA also fails its health check" >&2
  if [[ "$MODE" == "auto" && -n "${FAILED:-}" ]]; then
    echo "restoring the failed release $FAILED so the stack is not left on a broken target" >&2
    ssh "$VPS_SSH_HOST" "cd '$REMOTE_DIR' && IMAGE_TAG='$FAILED' docker compose up -d --wait --wait-timeout 180 app web" || true
  fi
  exit 1
fi

ssh "$VPS_SSH_HOST" "cd '$REMOTE_DIR' && echo '$TARGET_SHA' > releases/current && echo '$CURRENT' > releases/previous"
echo "rollback: now serving $TARGET_SHA (previous pointer: $CURRENT)"
