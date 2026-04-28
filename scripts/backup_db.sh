#!/usr/bin/env bash
# Manual Postgres backup → ./backups/YYYY-MM-DD_HH-MM.sql.gz
#
# Usage:
#   ./scripts/backup_db.sh
#
# Reads DATABASE_PUBLIC_URL from `railway variables`. Requires `pg_dump`
# (install with `brew install postgresql@16` if you don't have it).
#
# Run this BEFORE any risky schema or data change.

set -euo pipefail

cd "$(dirname "$0")/.."

mkdir -p backups
TS=$(date +%Y-%m-%d_%H-%M)
OUT="backups/${TS}.sql.gz"

# Pull the public DB URL from Railway (works only when linked to the Postgres service)
DB_URL=$(railway service Postgres >/dev/null 2>&1 && railway variables --kv | grep '^DATABASE_PUBLIC_URL=' | sed 's/^DATABASE_PUBLIC_URL=//' | tr -d '"')

if [[ -z "$DB_URL" ]]; then
  echo "Could not read DATABASE_PUBLIC_URL from Railway. Make sure you're authenticated and linked." >&2
  exit 1
fi

echo "Dumping → $OUT"
pg_dump --no-owner --no-acl --clean --if-exists "$DB_URL" | gzip > "$OUT"
SIZE=$(du -h "$OUT" | cut -f1)
echo "✓ $SIZE"

# Restore command for documentation
echo ""
echo "To restore later:"
echo "  gunzip -c $OUT | psql \"\$DATABASE_PUBLIC_URL\""
