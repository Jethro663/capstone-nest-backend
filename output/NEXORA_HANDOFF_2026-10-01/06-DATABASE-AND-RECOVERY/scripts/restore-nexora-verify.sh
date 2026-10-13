#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 --admin-url URL --backup DIRECTORY --target-db NAME_restore_test --confirm CREATE_EMPTY_TARGET" >&2
  exit 2
}

admin_url=""; backup=""; target_db=""; confirm=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --admin-url) admin_url="${2:-}"; shift 2 ;;
    --backup) backup="${2:-}"; shift 2 ;;
    --target-db) target_db="${2:-}"; shift 2 ;;
    --confirm) confirm="${2:-}"; shift 2 ;;
    *) usage ;;
  esac
done

[[ -n "$admin_url" && -n "$backup" && -n "$target_db" ]] || usage
[[ "$confirm" == "CREATE_EMPTY_TARGET" ]] || { echo "Explicit confirmation missing." >&2; exit 3; }
[[ "$target_db" =~ ^[A-Za-z0-9_]+_restore_test$ ]] || { echo "Target must end in _restore_test." >&2; exit 3; }
[[ -f "$backup/database.dump" && -f "$backup/MANIFEST.sha256" ]] || { echo "Backup dump or manifest missing." >&2; exit 3; }

command -v createdb >/dev/null || { echo "createdb is required." >&2; exit 4; }
command -v pg_restore >/dev/null || { echo "pg_restore is required." >&2; exit 4; }
(cd "$backup" && sha256sum --check MANIFEST.sha256)

if psql "$admin_url" -Atqc "SELECT 1 FROM pg_database WHERE datname = '$target_db'" | grep -q 1; then
  echo "Target database already exists; refusing to overwrite it." >&2
  exit 5
fi

createdb --maintenance-db "$admin_url" "$target_db"
target_url="${admin_url%/*}/$target_db"
pg_restore --exit-on-error --no-owner --no-privileges --dbname "$target_url" "$backup/database.dump"
psql "$target_url" -v ON_ERROR_STOP=1 -c "SELECT current_database(), now();"
echo "Restore completed into $target_db. Application integrity and role smoke checks are still required."
