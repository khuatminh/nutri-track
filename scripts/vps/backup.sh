#!/usr/bin/env bash
# Encrypted-less compressed logical backup of the VPS NutriTrack database.
# Runs on the VPS from /opt/nutritrack (shipped by scripts/vps/deploy.sh).
# Keeps the last KEEP dumps (default 7). Database contains test/staging data only.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

KEEP="${KEEP:-7}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p backups
chmod 700 backups

if ! docker compose ps --status running --services 2>/dev/null | grep -qx db; then
  echo "backup: db service is not running, nothing to dump"
  exit 0
fi

OUT="backups/nutritrack-${STAMP}.dump"
docker compose exec -T db pg_dump -U nutritrack -d nutritrack -Fc > "$OUT"
gzip -6 "$OUT"
sha256sum "${OUT}.gz" > "${OUT}.gz.sha256"

echo "backup: ${OUT}.gz ($(du -h "${OUT}.gz" | cut -f1))"

# Retention: newest KEEP dumps, older ones removed.
ls -1t backups/nutritrack-*.dump.gz 2>/dev/null | tail -n "+$((KEEP + 1))" | while read -r old; do
  rm -f "$old" "$old.sha256"
  echo "backup: pruned $old"
done
