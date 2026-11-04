#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
for command in docker node pnpm; do
  command -v "$command" >/dev/null || { echo "Missing prerequisite: $command" >&2; exit 1; }
done
[[ "$(node -p 'process.versions.node.split(".")[0]')" == 22 ]] || {
  echo "Node.js 22 is required." >&2; exit 1;
}
[[ -f .env ]] || { echo "Copy .env.example to .env first." >&2; exit 1; }
[[ -f package.json ]] || { echo "Application package.json is not available yet." >&2; exit 1; }

# Compose waits for the configured database healthcheck, with a bounded timeout.
docker compose up -d --wait --wait-timeout 120 db mailpit
extensions="$(docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT extname FROM pg_extension WHERE extname IN ('"'"'pg_trgm'"'"', '"'"'unaccent'"'"') ORDER BY extname"')"
[[ "$extensions" == $'pg_trgm\nunaccent' ]] || {
  echo "Missing pg_trgm/unaccent; see README for existing-volume recovery." >&2; exit 1;
}
pnpm exec prisma migrate deploy
pnpm exec prisma db seed
echo "Local database migration and seed completed."
