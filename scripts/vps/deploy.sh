#!/usr/bin/env bash
# Deploy NutriTrack to the Oracle VPS (QLD-53).
#
# Flow: build a release image for the VPS architecture locally → ship it over SSH →
# db/mailpit up → backup → `prisma migrate deploy` through an SSH tunnel → app up →
# health check → record the release. On a failed health check the previous image is
# restored automatically.
#
# The VPS Oracle is aarch64 (ARM64), so the image MUST be built for linux/arm64.
# The platform is derived from `uname -m` on the target host; a mismatching
# PLATFORM override is rejected because it only produces `exec format error`.
#
# The stack publishes only loopback ports on the VPS; use an SSH tunnel to browse it:
#   ssh -N -L 3200:127.0.0.1:3200 oracle-vps   →   http://127.0.0.1:3200
#
# Configuration (env vars, all optional):
#   VPS_SSH_HOST     SSH alias/host from ~/.ssh/config          (default: oracle-vps)
#   REMOTE_DIR       deploy directory on the VPS                (default: /opt/nutritrack)
#   APP_PORT         loopback port for the app on the VPS       (default: 3200)
#   DB_TUNNEL_PORT   loopback port of Postgres on the VPS       (default: 55432)
#   IMAGE_REPO       local image repository name                (default: nutritrack)
#   PLATFORM         docker build platform                      (default: detected from remote arch)
#   ALLOW_PLATFORM_MISMATCH=1  allow a platform that differs from the remote arch
#   ALLOW_DIRTY=1    build from a dirty tree (SHA will not describe the build)
#   SKIP_MIGRATE=1   skip `prisma migrate deploy` (docs-only changes)
#   SKIP_BACKUP=1    skip the pre-migration database dump
#
# Requires on this machine: git, docker (buildx), ssh, pnpm + node_modules.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

VPS_SSH_HOST="${VPS_SSH_HOST:-oracle-vps}"
REMOTE_DIR="${REMOTE_DIR:-/opt/nutritrack}"
APP_PORT="${APP_PORT:-3200}"
WEB_PORT="${WEB_PORT:-8080}"
DB_TUNNEL_PORT="${DB_TUNNEL_PORT:-55432}"
# Public origin written into APP_URL (password-reset links, absolute URLs).
# Override for every public deployment, e.g. APP_URL=https://nutritrack.example.com
PUBLIC_APP_URL="${APP_URL:-http://127.0.0.1:${APP_PORT}}"
IMAGE_REPO="${IMAGE_REPO:-nutritrack}"
PLATFORM="${PLATFORM:-}"
LOCAL_DB_PORT="${LOCAL_DB_PORT:-$DB_TUNNEL_PORT}"

log() { printf '\n==> %s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------- preconditions
log "Preconditions"
git rev-parse --git-dir >/dev/null 2>&1 || die "not a git checkout"
SHA="$(git rev-parse --short=12 HEAD)"
if [[ -n "$(git status --porcelain)" && "${ALLOW_DIRTY:-0}" != "1" ]]; then
  die "working tree is dirty; the image tag would not describe the build (ALLOW_DIRTY=1 to override)"
fi
command -v docker >/dev/null || die "docker is required to build the release image"
REMOTE_ARCH="$(ssh -o BatchMode=yes -o ConnectTimeout=10 "$VPS_SSH_HOST" 'uname -m')" \
  || die "cannot SSH to '$VPS_SSH_HOST' non-interactively (check ~/.ssh/config and keys)"

# The image must match the VPS architecture; an amd64 image on an ARM64 host dies
# with `exec format error` (or crawls under qemu). Derive it instead of hard-coding.
case "$REMOTE_ARCH" in
  aarch64|arm64) TARGET_PLATFORM="linux/arm64" ;;
  x86_64|amd64)  TARGET_PLATFORM="linux/amd64" ;;
  *) die "unsupported remote architecture '$REMOTE_ARCH' on $VPS_SSH_HOST" ;;
esac
if [[ -n "$PLATFORM" && "$PLATFORM" != "$TARGET_PLATFORM" ]]; then
  if [[ "${ALLOW_PLATFORM_MISMATCH:-0}" != "1" ]]; then
    die "PLATFORM=$PLATFORM does not match $VPS_SSH_HOST ($REMOTE_ARCH → $TARGET_PLATFORM); unset PLATFORM or set ALLOW_PLATFORM_MISMATCH=1"
  fi
  printf 'warning: building %s for a %s host (%s) — expect exec format error\n' \
    "$PLATFORM" "$REMOTE_ARCH" "$TARGET_PLATFORM" >&2
fi
PLATFORM="${PLATFORM:-$TARGET_PLATFORM}"

echo "release  : $SHA"
echo "host     : $VPS_SSH_HOST:$REMOTE_DIR ($REMOTE_ARCH)"
echo "image    : $IMAGE_REPO:$SHA ($PLATFORM)"

# ---------------------------------------------------------------- build image
log "Build release image"
docker buildx build \
  --platform "$PLATFORM" \
  --build-arg "GIT_SHA=$SHA" \
  -f docker/app/Dockerfile \
  -t "$IMAGE_REPO:$SHA" \
  --load \
  .
docker image inspect --format 'image size: {{.Size}} bytes' "$IMAGE_REPO:$SHA"

# ---------------------------------------------------------------- prepare remote
log "Sync compose files to $REMOTE_DIR"
ssh "$VPS_SSH_HOST" "mkdir -p '$REMOTE_DIR/postgres-init' '$REMOTE_DIR/releases' '$REMOTE_DIR/backups'"
scp -q scripts/vps/compose.yml "$VPS_SSH_HOST:$REMOTE_DIR/compose.yml"
scp -q scripts/vps/Caddyfile "$VPS_SSH_HOST:$REMOTE_DIR/Caddyfile"
scp -q scripts/vps/backup.sh scripts/vps/healthcheck.sh "$VPS_SSH_HOST:$REMOTE_DIR/"
scp -q docker/postgres/init/*.sql "$VPS_SSH_HOST:$REMOTE_DIR/postgres-init/"
ssh "$VPS_SSH_HOST" "chmod 755 '$REMOTE_DIR/backup.sh' '$REMOTE_DIR/healthcheck.sh'"

log "Ensure remote .env exists"
ssh "$VPS_SSH_HOST" env REMOTE_DIR="$REMOTE_DIR" APP_PORT="$APP_PORT" WEB_PORT="$WEB_PORT" \
  DB_TUNNEL_PORT="$DB_TUNNEL_PORT" PUBLIC_APP_URL="$PUBLIC_APP_URL" bash -s <<'REMOTE_ENV'
set -euo pipefail
cd "$REMOTE_DIR"
if [[ -f .env ]]; then
  echo "  .env already present (left untouched)"
  exit 0
fi
umask 077
{
  echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)"
  echo "APP_URL=${PUBLIC_APP_URL}"
  echo "SMTP_HOST=mailpit"
  echo "SMTP_PORT=1025"
  echo "MAIL_FROM=NutriTrack Staging <no-reply@nutritrack.local>"
  echo "TZ=Asia/Ho_Chi_Minh"
  echo "APP_PORT=${APP_PORT}"
  echo "WEB_PORT=${WEB_PORT}"
  echo "DB_TUNNEL_PORT=${DB_TUNNEL_PORT}"
  echo "MAILPIT_PORT=8026"
} > .env
echo "  generated .env (mode 600)"
REMOTE_ENV

# ---------------------------------------------------------------- ship image
log "Ship image over SSH (docker save | docker load)"
docker save "$IMAGE_REPO:$SHA" | gzip -1 | ssh "$VPS_SSH_HOST" 'gunzip | docker load'

# ---------------------------------------------------------------- data services
log "Start db + mailpit"
ssh "$VPS_SSH_HOST" "cd '$REMOTE_DIR' && IMAGE_TAG='$SHA' docker compose up -d --wait db mailpit"

if [[ "${SKIP_BACKUP:-0}" != "1" ]]; then
  log "Pre-migration backup"
  ssh "$VPS_SSH_HOST" "cd '$REMOTE_DIR' && ./backup.sh" || echo "  backup skipped (first deploy or db error)"
fi

# ---------------------------------------------------------------- migrate
if [[ "${SKIP_MIGRATE:-0}" != "1" ]]; then
  log "Apply Prisma migrations through an SSH tunnel"
  TUNNEL_PID=""
  cleanup() { [[ -n "$TUNNEL_PID" ]] && kill "$TUNNEL_PID" 2>/dev/null || true; }
  trap cleanup EXIT
  ssh -N -o ExitOnForwardFailure=yes -L "127.0.0.1:${LOCAL_DB_PORT}:127.0.0.1:${DB_TUNNEL_PORT}" "$VPS_SSH_HOST" &
  TUNNEL_PID=$!
  for _ in $(seq 1 20); do
    nc -z 127.0.0.1 "$LOCAL_DB_PORT" 2>/dev/null && break
    sleep 0.5
  done
  nc -z 127.0.0.1 "$LOCAL_DB_PORT" 2>/dev/null || die "SSH tunnel to the database did not open"

  DB_PASSWORD="$(ssh "$VPS_SSH_HOST" "sed -n 's/^POSTGRES_PASSWORD=//p' '$REMOTE_DIR/.env'")"
  [[ -n "$DB_PASSWORD" ]] || die "POSTGRES_PASSWORD missing from remote .env"
  export DATABASE_URL="postgresql://nutritrack:${DB_PASSWORD}@127.0.0.1:${LOCAL_DB_PORT}/nutritrack?schema=public"

  [[ -x node_modules/.bin/prisma ]] || pnpm install --frozen-lockfile
  pnpm exec prisma migrate deploy

  # Seed only the first time: releases/current is written at the end of a successful deploy.
  if ! ssh "$VPS_SSH_HOST" "test -s '$REMOTE_DIR/releases/current'"; then
    log "First deploy: generate client and seed foods"
    pnpm exec prisma generate
    pnpm exec prisma db seed
  fi
  cleanup
  TUNNEL_PID=""
  trap - EXIT
fi

# ---------------------------------------------------------------- switch app
log "Record previous release and start app + reverse proxy"
ssh "$VPS_SSH_HOST" "cd '$REMOTE_DIR' && \
  if [[ -s releases/current ]]; then cp releases/current releases/previous; fi && \
  IMAGE_TAG='$SHA' docker compose up -d --wait --wait-timeout 180 app web"

log "Health check (app and reverse proxy)"
if ! ssh "$VPS_SSH_HOST" "cd '$REMOTE_DIR' && APP_PORT='$APP_PORT' ./healthcheck.sh" \
  || ! ssh "$VPS_SSH_HOST" "cd '$REMOTE_DIR' && HEALTH_URL='http://127.0.0.1:${WEB_PORT}/dang-nhap' ./healthcheck.sh"; then
  echo "health check failed — rolling back" >&2
  bash scripts/vps/rollback.sh --auto "$SHA" || true
  die "deploy failed; previous release restored (see output above)"
fi

ssh "$VPS_SSH_HOST" "cd '$REMOTE_DIR' && echo '$SHA' > releases/current && date -u +%FT%TZ >> releases/current \
  && (grep -q '^IMAGE_TAG=' .env && sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=$SHA/' .env || echo 'IMAGE_TAG=$SHA' >> .env)"

# Keep the running and the previous image only; the VPS has little disk headroom.
log "Prune old images"
ssh "$VPS_SSH_HOST" "bash -s" <<REMOTE_PRUNE
set -euo pipefail
keep="$SHA"
prev="\$(cat '$REMOTE_DIR/releases/previous' 2>/dev/null || true)"
for img in \$(docker images '$IMAGE_REPO' --format '{{.Tag}}'); do
  if [[ "\$img" == "\$keep" || "\$img" == "\$prev" ]]; then continue; fi
  docker rmi '$IMAGE_REPO:'"\$img" >/dev/null 2>&1 || true
done
REMOTE_PRUNE

log "Deployed $SHA"
cat <<EOF

Release : $SHA
Host    : $VPS_SSH_HOST ($REMOTE_DIR)
App URL : $PUBLIC_APP_URL
Local   : ssh -N -L ${WEB_PORT}:127.0.0.1:${WEB_PORT} ${VPS_SSH_HOST}
          open http://127.0.0.1:${WEB_PORT}/dang-nhap
Logs    : ssh ${VPS_SSH_HOST} "cd ${REMOTE_DIR} && IMAGE_TAG=${SHA} docker compose logs -f app web"
Rollback: bash scripts/vps/rollback.sh
EOF
