# Shared helpers for the internal staging scripts. Source only.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STATE="$ROOT/.staging"
SECRETS="$STATE/secrets.env"
PASSPHRASE="$STATE/backup.passphrase"
BACKUPS="$STATE/backups"
URL="https://nutritrack-staging.localhost:8443"

# GIT_SHA is an image tag; it must be set for every compose call, not only for the build.
dc() {
  local sha
  sha="$(cat "$STATE/STAGING_SHA" 2>/dev/null || git -C "$ROOT" rev-parse HEAD)"
  GIT_SHA="$sha" docker compose --env-file "$SECRETS" -f "$ROOT/scripts/staging/compose.yml" "$@"
}

psql_in() { # psql_in <db> <args...>
  local db="$1"; shift
  dc exec -T db psql -v ON_ERROR_STOP=1 -U nutritrack -d "$db" "$@"
}

# One "table|rows|md5" line per public table. Same server, so collation is identical on both sides.
fingerprint() {
  local db="$1" t
  for t in $(psql_in "$db" -Atc "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1"); do
    psql_in "$db" -Atc "SELECT '$t', count(*), md5(coalesce(string_agg(x::text, '|' ORDER BY x::text), '')) FROM \"$t\" x"
  done
}

# Isolated keyring: never touches the operator's ~/.gnupg.
gpg_tmp() {
  local home rc=0
  home="$(mktemp -d)"
  gpg --homedir "$home" --batch --yes --quiet --pinentry-mode loopback --passphrase-file "$PASSPHRASE" "$@" || rc=$?
  rm -rf "$home"
  return "$rc"
}
