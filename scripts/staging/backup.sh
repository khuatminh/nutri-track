#!/usr/bin/env bash
# Encrypted logical backup of the staging DB. Run while nothing writes, because the
# fingerprint is a separate read from the dump's snapshot.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

name="nutritrack-$(date -u +%Y%m%dT%H%M%SZ)"
out="$BACKUPS/$name.dump.gpg"
umask 077
fingerprint nutritrack > "$BACKUPS/$name.fingerprint"
[[ -s "$BACKUPS/$name.fingerprint" ]] || { echo "Refusing: empty fingerprint, restore could not be verified." >&2; exit 1; }
dc exec -T db pg_dump -U nutritrack -d nutritrack -Fc | gpg_tmp --symmetric --cipher-algo AES256 --output "$out"
(cd "$BACKUPS" && shasum -a 256 "$name.dump.gpg" > "$name.sha256")
echo "Backup: $out ($(wc -c < "$out" | tr -d ' ') bytes)"
