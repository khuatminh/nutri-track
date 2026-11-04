#!/usr/bin/env bash
# Restores a backup into a NEW isolated database and compares it with the backup's fingerprint.
# It never restores over the live `nutritrack` database.
# Usage: restore.sh <file.dump.gpg> [--drop-after]
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

file="${1:?usage: restore.sh <file.dump.gpg> [--drop-after]}"
base="${file%.dump.gpg}"
target="nutritrack_restore_$(date -u +%Y%m%d%H%M%S)"

(cd "$(dirname "$file")" && shasum -a 256 -c "$(basename "$base").sha256")

psql_in postgres -qc "CREATE DATABASE \"$target\""
gpg_tmp --decrypt "$file" | dc exec -T db pg_restore -U nutritrack -d "$target" --no-owner --exit-on-error

actual="$(mktemp)"
trap 'rm -f "$actual"' EXIT
fingerprint "$target" > "$actual"
if ! diff "$base.fingerprint" "$actual"; then
  echo "FAIL: $target differs from the backup fingerprint (database kept for diagnosis)." >&2
  exit 1
fi
echo "PASS: $target matches $(basename "$base").fingerprint ($(wc -l < "$actual" | tr -d ' ') tables)"
if [[ "${2:-}" == "--drop-after" ]]; then
  psql_in postgres -qc "DROP DATABASE \"$target\""
  echo "Dropped $target"
fi
