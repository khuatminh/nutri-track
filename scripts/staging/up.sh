#!/usr/bin/env bash
# Builds and starts internal staging from the current clean checkout, then records its SHA.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

[[ -z "$(git -C "$ROOT" status --porcelain)" ]] || { echo "Refusing: working tree is dirty, the SHA would not describe the build." >&2; exit 1; }
mkdir -p "$BACKUPS"; chmod 700 "$STATE"
umask 077
[[ -f "$SECRETS" ]] || echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)" > "$SECRETS"
[[ -f "$PASSPHRASE" ]] || openssl rand -hex 32 > "$PASSPHRASE"
umask 022

git -C "$ROOT" rev-parse HEAD > "$STATE/STAGING_SHA"
# Only `app` builds; `migrate` reuses that image tag, so the build must come first.
dc build app
dc up -d --wait --wait-timeout 300 db mailpit app caddy

# Caddy creates its local CA lazily, so ask for the file until it exists.
for _ in $(seq 1 30); do
  dc exec -T caddy cat /data/caddy/pki/authorities/local/root.crt > "$STATE/ca-root.crt" 2>/dev/null && [[ -s "$STATE/ca-root.crt" ]] && break
  sleep 2
done
for _ in $(seq 1 60); do
  curl -fsS -o /dev/null --cacert "$STATE/ca-root.crt" "$URL/dang-nhap" && break
  sleep 2
done
curl -fsS -o /dev/null --cacert "$STATE/ca-root.crt" "$URL/dang-nhap"
echo "URL: $URL"
echo "SHA: $(cat "$STATE/STAGING_SHA")"
echo "CA : $STATE/ca-root.crt"
